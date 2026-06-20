// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useEffect, useState } from 'react'
import { useLingui, Trans } from '@lingui/react/macro'
import type {
  AuthMethodsResponse,
  MethodInfo,
  MethodState,
  OAuthIdentity,
  OAuthProvider,
  Passkey,
  TotpSetupResponse,
} from '@/types/account'
import { MethodStateControl } from '@/components/method-state-control'
import type { startRegistration } from '@simplewebauthn/browser'
import {
  Check,
  Copy,
  Key,
  Link2,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import {
  useAuthMethods,
  useMethods,
  useOauthBegin,
  useOauthIdentities,
  useOauthUnlink,
  usePasskeyDelete,
  usePasskeyRegisterBegin,
  usePasskeyRegisterFinish,
  usePasskeyRename,
  usePasskeys,
  useRecoveryGenerate,
  useRecoveryStatus,
  useSetMethod,
  useTotpDisable,
  useTotpSetup,
  useTotpStatus,
  useTotpVerify,
} from '@/hooks/use-account'
import { useStepUp } from '@/lib/use-step-up'
import {
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  Input,
  Label,
  ListSkeleton,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  PageHeader,
  Main,
  usePageTitle,
  Section,
  FieldRow,
  DataChip,
  Alert,
  AlertTitle,
  AlertDescription,
  GeneralError,
  EmptyState,
  getErrorMessage,
  shellNavigateTop,
  shellWebauthnCreate,
  toast,
  useFormat,
  shellClipboardWrite,
  ServerDocumentsFooter,
} from '@mochi/web'

type RegistrationOptionsJSON = Parameters<typeof startRegistration>[0]['optionsJSON']

// ============================================================================
// Login Methods Section
// ============================================================================

// One row per login method. "required" is offered for the primary factors
// (email, passkey, authenticator, third-party login). Recovery is two-state
// (sufficient-or-off): single-use break-glass, never an AND-ed requirement.
const LOGIN_METHOD_ROWS: { method: string; twoState: boolean }[] = [
  { method: 'email', twoState: false },
  { method: 'passkey', twoState: false },
  { method: 'totp', twoState: false },
  { method: 'oauth', twoState: false },
  { method: 'recovery', twoState: true },
]

function LoginRequirementsSection() {
  const { t } = useLingui()
  const { data: methodsData, isLoading, error, refetch } = useMethods()
  const setMethod = useSetMethod()
  const stepUp = useStepUp()

  const states = methodsData?.methods

  const methodLabel = (method: string): string => {
    switch (method) {
      case 'email':
        return t`Email code`
      case 'passkey':
        return t`Passkey`
      case 'totp':
        return t`Authenticator app`
      case 'oauth':
        return t`Third-party login`
      case 'recovery':
        return t`Recovery codes`
      default:
        return method
    }
  }

  // Third-party login only appears once a provider is linked (the Third-party
  // login section below handles linking); recovery only when the operator
  // permits it. The primary factors always show, greyed when not set up.
  const visible = (method: string, info: MethodInfo): boolean => {
    if (method === 'oauth') return info.available || info.state === 'required'
    if (method === 'recovery') return info.system !== 'disabled'
    return true
  }

  const handleChange = (method: string, state: MethodState) => {
    stepUp.request((token) =>
      setMethod.mutate(
        { method, state, token },
        {
          onSuccess: () => toast.success(t`Login methods updated`),
          onError: (e) => toast.error(getErrorMessage(e, t`Failed to update login methods`)),
        },
      ),
    )
  }

  return (
    <>
    <Section title={t`Login methods`}>
      {error ? (
        <GeneralError error={error} minimal mode='inline' reset={refetch} />
      ) : isLoading || !states ? (
        <ListSkeleton variant='simple' height='h-12' count={3} />
      ) : (
        <div className='divide-y-0'>
          {LOGIN_METHOD_ROWS.map(({ method, twoState }) => {
            const info = states[method]
            if (!info || !visible(method, info)) return null

            const base: MethodState[] = twoState
              ? ['disabled', 'allowed']
              : ['disabled', 'allowed', 'required']
            // Always include the current state so a value set by operator
            // policy (e.g. a system-required method) stays visible.
            const slots = base.includes(info.state) ? base : [...base, info.state]

            const unavailable = new Set<MethodState>()
            if (info.system === 'disabled') {
              unavailable.add('allowed')
              unavailable.add('required')
            }
            if (info.system === 'required') {
              unavailable.add('disabled')
              unavailable.add('allowed')
            }
            if (!info.available) {
              unavailable.add('allowed')
              unavailable.add('required')
            }

            return (
              <FieldRow key={method} label={methodLabel(method)}>
                <MethodStateControl
                  value={info.state}
                  slots={slots}
                  unavailable={unavailable}
                  busy={setMethod.isPending}
                  onChange={(next) => handleChange(method, next)}
                />
              </FieldRow>
            )
          })}
        </div>
      )}
    </Section>
    {stepUp.dialog}
    </>
  )
}

// ============================================================================
// Passkeys Section
// ============================================================================

function PasskeyRow({
  passkey,
  onRename,
  onDelete,
}: {
  passkey: Passkey
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}) {
  const { t } = useLingui()
  const { formatTimestamp } = useFormat()
  const [isRenaming, setIsRenaming] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [newName, setNewName] = useState(passkey.name)

  const handleRename = () => {
    if (newName.trim() && newName !== passkey.name) {
      onRename(passkey.id, newName.trim())
    }
    setIsRenaming(false)
  }

  return (
    <TableRow>
      <TableCell>
        {isRenaming ? (
          <div className='flex items-center gap-2'>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className='h-8 w-40'
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') setIsRenaming(false)
              }}
            />
            <Button size='sm' variant='ghost' onClick={handleRename} aria-label={t`Save passkey name`}>
              <Check className='h-4 w-4' />
            </Button>
          </div>
        ) : (
          <span className='font-medium'>{passkey.name}</span>
        )}
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {formatTimestamp(passkey.created, t`Never`)}
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {formatTimestamp(passkey.last_used, t`Never`)}
      </TableCell>
      <TableCell className='text-end'>
        <div className='flex justify-end gap-1'>
          <Button variant='ghost' size='sm' onClick={() => setIsRenaming(true)} aria-label={t`Rename passkey`}>
            <Pencil className='h-4 w-4' />
          </Button>
          <Button variant='ghost' size='sm' onClick={() => setShowDeleteDialog(true)} aria-label={t`Delete passkey`}>
            <Trash2 className='h-4 w-4' />
          </Button>
          <ConfirmDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            title={t`Delete passkey?`}
            desc={t`This will remove "${passkey.name}" from your account. You won't be able to use it to sign in anymore.`}
            confirmText={t`Delete`}
            destructive
            handleConfirm={() => {
              onDelete(passkey.id)
              setShowDeleteDialog(false)
            }}
          />
        </div>
      </TableCell>
    </TableRow>
  )
}

function PasskeysSection() {
  const { t } = useLingui()
  const { data, isLoading, error, refetch } = usePasskeys()
  const { data: methodsData } = useMethods()
  // Passkeys disabled server-wide: block registration to match the server.
  const passkeyDisabled = methodsData?.methods?.passkey?.system === 'disabled'
  const registerBegin = usePasskeyRegisterBegin()
  const registerFinish = usePasskeyRegisterFinish()
  const renamePasskey = usePasskeyRename()
  const deletePasskey = usePasskeyDelete()
  const stepUp = useStepUp()
  const [isRegistering, setIsRegistering] = useState(false)
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false)
  const [passkeyName, setPasskeyName] = useState('')

  const handleRegister = () => {
    // Re-authenticate first (adding a login credential is a security
    // change), then run the registration ceremony with the proof token.
    setRegisterDialogOpen(false)
    stepUp.request(async (token) => {
      setIsRegistering(true)
      try {
        const beginResult = await registerBegin.mutateAsync()
        const credential = await shellWebauthnCreate(
          beginResult.options as RegistrationOptionsJSON
        )
        await registerFinish.mutateAsync({
          ceremony: beginResult.ceremony,
          credential,
          name: passkeyName || t`Passkey`,
          token,
        })
        toast.success(t`Passkey registered`)
        setPasskeyName('')
      } catch (error) {
        if ((error as { name?: string })?.name === 'NotAllowedError') {
          toast.error(t`Registration cancelled`)
        } else {
          toast.error(getErrorMessage(error, t`Failed to register passkey`))
        }
      } finally {
        setIsRegistering(false)
      }
    })
  }

  const handleRename = (id: string, name: string) => {
    renamePasskey.mutate(
      { id, name },
      {
        onSuccess: () => toast.success(t`Passkey renamed`),
        onError: (error) => toast.error(getErrorMessage(error, t`Failed to rename passkey`)),
      }
    )
  }

  const handleDelete = (id: string) => {
    deletePasskey.mutate(id, {
      onSuccess: () => toast.success(t`Passkey deleted`),
      onError: (error) => toast.error(getErrorMessage(error, t`Failed to delete passkey`)),
    })
  }

  const passkeys = data?.passkeys ?? []

  const addButton = (
    <ResponsiveDialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
      <Button
        variant='outline'
        size='sm'
        onClick={() => setRegisterDialogOpen(true)}
        disabled={passkeyDisabled}
      >
        <Plus className='me-2 h-4 w-4' />
        <Trans>Add passkey</Trans>
      </Button>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle><Trans>Register passkey</Trans></ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            <Trans>Use a security key, fingerprint, or face recognition.</Trans>
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className='py-4'>
          <Label htmlFor='passkey-name'><Trans>Passkey name</Trans></Label>
          <Input
            id='passkey-name'
            placeholder={t`My passkey`}
            value={passkeyName}
            onChange={(e) => setPasskeyName(e.target.value)}
            className='mt-2'
          />
        </div>
        <ResponsiveDialogFooter>
          <Button onClick={handleRegister} disabled={isRegistering}>
            <Trans>Register</Trans>
            {isRegistering && (
              <Loader2 className='ms-2 h-4 w-4 animate-spin' />
            )}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )

  return (
    <>
    <Section
      title={t`Passkeys`}
      action={addButton}
    >
      {passkeyDisabled && (
        <p className='text-muted-foreground mb-2 px-4 text-sm leading-relaxed'>
          <Trans>Passkeys are turned off by the server administrator.</Trans>
        </p>
      )}
      {error ? (
        <GeneralError error={error} minimal mode='inline' reset={refetch} />
      ) : isLoading ? (
        <ListSkeleton variant='simple' height='h-10' count={2} />
      ) : passkeys.length === 0 ? (
        <EmptyState icon={Key} title={t`No passkeys registered`} className='p-4' />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><Trans>Name</Trans></TableHead>
              <TableHead><Trans>Created</Trans></TableHead>
              <TableHead><Trans>Last used</Trans></TableHead>
              <TableHead className='w-24'></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {passkeys.map((passkey) => (
              <PasskeyRow
                key={passkey.id}
                passkey={passkey}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </Section>
    {stepUp.dialog}
    </>
  )
}

// ============================================================================
// Authenticator App Section
// ============================================================================

function AuthenticatorSection() {
  const { t } = useLingui()
  const { data, isLoading, error, refetch } = useTotpStatus()
  const setupTotp = useTotpSetup()
  const verifyTotp = useTotpVerify()
  const disableTotp = useTotpDisable()
  const stepUp = useStepUp()
  const [setupData, setSetupData] = useState<TotpSetupResponse | null>(null)
  const [showDisableDialog, setShowDisableDialog] = useState(false)
  const [verifyCode, setVerifyCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  const handleSetup = () => {
    // Re-authenticate before enabling a new factor.
    stepUp.request(async (token) => {
      try {
        const result = await setupTotp.mutateAsync(token)
        setSetupData(result)
      } catch (error) {
        toast.error(getErrorMessage(error, t`Failed to set up authenticator`))
      }
    })
  }

  const handleVerify = async () => {
    if (!verifyCode) return
    setIsVerifying(true)
    try {
      const result = await verifyTotp.mutateAsync(verifyCode)
      if (result.ok) {
        toast.success(t`Authenticator app enabled`)
        setSetupData(null)
        setVerifyCode('')
      } else {
        toast.error(t`Invalid code`)
      }
    } catch (error) {
      toast.error(getErrorMessage(error, t`Failed to verify code`))
    } finally {
      setIsVerifying(false)
    }
  }

  const handleDisable = () => {
    stepUp.request((token) =>
      disableTotp.mutate(token, {
        onSuccess: () => toast.success(t`Authenticator app disabled`),
        onError: (error) => toast.error(getErrorMessage(error, t`Failed to disable authenticator`)),
      }))
  }

  const isEnabled = data?.enabled ?? false

  const action = setupData
    ? null
    : isEnabled ? (
      <Button
        variant='outline'
        size='sm'
        onClick={() => setShowDisableDialog(true)}
      >
        <Trash2 className='me-2 h-4 w-4' />
        <Trans>Disable</Trans>
      </Button>
    ) : (
      <Button
        variant='outline'
        size='sm'
        onClick={handleSetup}
        disabled={setupTotp.isPending}
      >
        <Plus className='me-2 h-4 w-4' />
        <Trans>Set up</Trans>
      </Button>
    )

  return (
    <>
    <Section
      title={t`Authenticator app`}
      action={action}
    >
      {error ? (
        <GeneralError error={error} minimal mode='inline' reset={refetch} />
      ) : isLoading ? (
        <div className='py-2'>
          <Skeleton className='h-20 w-full' />
        </div>
      ) : setupData ? (
        <div className='space-y-6 py-4'>
          <div className='space-y-3'>
            <p className='text-sm font-medium'><Trans>1. Scan QR code</Trans></p>
            <div className='flex justify-center rounded-xl border-2 bg-white p-6 shadow-sm'>
              <QRCodeSVG value={setupData.url} size={200} />
            </div>
          </div>
          <div className='space-y-2.5'>
            <Label className='text-sm font-medium'><Trans>2. Manual entry</Trans></Label>
            <DataChip value={setupData.secret} chipClassName='flex-1' />
          </div>
          <div className='border-t pt-6 space-y-4'>
            <p className='text-sm font-medium'><Trans>3. Verify code</Trans></p>
            <div className='flex items-center gap-3'>
              <Input
                placeholder='000000'
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                className='w-32 font-mono text-center'
                maxLength={6}
              />
              <Button
                onClick={handleVerify}
                disabled={isVerifying || !verifyCode}
              >
                <Trans>Verify and enable</Trans>
                {isVerifying && <Loader2 className='ms-2 h-4 w-4 animate-spin' />}
              </Button>
              <Button variant='ghost' onClick={() => setSetupData(null)}><Trans>Cancel</Trans></Button>
            </div>
          </div>
        </div>
      ) : isEnabled ? (
        <div className='flex items-center gap-3 py-4'>
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-success/15 dark:bg-success/25'>
            <Check className='h-5 w-5 text-success' />
          </div>
          <div>
            <p className='text-sm font-medium'><Trans>Enabled</Trans></p>
            <p className='text-muted-foreground text-xs'><Trans>Authenticator app is active</Trans></p>
          </div>
        </div>
      ) : (
        <EmptyState icon={Shield} title={t`No authenticator set up`} className='p-4' />
      )}
      <ConfirmDialog
        open={showDisableDialog}
        onOpenChange={setShowDisableDialog}
        title={t`Disable authenticator?`}
        desc={t`This will remove the app from your account.`}
        confirmText={t`Disable`}
        destructive
        handleConfirm={() => {
          handleDisable()
          setShowDisableDialog(false)
        }}
      />
    </Section>
    {stepUp.dialog}
    </>
  )
}

// ============================================================================
// Recovery codes section
// ============================================================================

function RecoveryCodesSection() {
  const { t } = useLingui()
  const { data, isLoading, error, refetch } = useRecoveryStatus()
  const generateCodes = useRecoveryGenerate()
  const stepUp = useStepUp()
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [showCodes, setShowCodes] = useState<string[] | null>(null)

  const handleGenerate = () => {
    stepUp.request(async (token) => {
      try {
        const result = await generateCodes.mutateAsync(token)
        setShowCodes(result.codes)
      } catch (error) {
        toast.error(getErrorMessage(error, t`Failed to generate codes`))
      }
    })
  }

  const count = data?.count ?? 0

  const action = showCodes ? null : (
    <Button
      variant='outline'
      size='sm'
      onClick={() => setShowGenerateDialog(true)}
    >
      {count > 0 ? (
        <RefreshCw className='me-2 h-4 w-4' />
      ) : (
        <Plus className='me-2 h-4 w-4' />
      )}
      {count > 0 ? t`Regenerate` : t`Generate`}
    </Button>
  )

  return (
    <>
    <Section
      title={t`Recovery codes`}
      action={action}
    >
      {error ? (
        <GeneralError error={error} minimal mode='inline' reset={refetch} />
      ) : isLoading ? (
        <div className='py-2'><Skeleton className='h-20 w-full' /></div>
      ) : showCodes ? (
        <div className='space-y-5 py-4'>
          <Alert variant='destructive' className='bg-amber-50 dark:bg-amber-950/20 border-amber-200'>
            <Shield className='h-4 w-4 text-amber-600' />
            <AlertTitle><Trans>Save these codes</Trans></AlertTitle>
            <AlertDescription><Trans>Each code can only be used once.</Trans></AlertDescription>
          </Alert>
          <div className='bg-muted/30 rounded-xl border p-5'>
            <div className='grid grid-cols-2 gap-3 font-mono text-sm'>
              {showCodes.map((code, i) => (
                <div key={i} className='bg-background flex items-center justify-center rounded-md border py-2.5 font-semibold'>{code}</div>
              ))}
            </div>
          </div>
          <div className='flex gap-2'>
            <Button variant='outline' size='sm' onClick={() => {
              void shellClipboardWrite(showCodes.join('\n')).then((ok) => {
                if (ok) toast.success(t`Codes copied`)
              })
            }}><Copy className='size-3.5' /><Trans>Copy all</Trans></Button>
            <Button variant='ghost' size='sm' onClick={() => setShowCodes(null)}><Trans>Done</Trans></Button>
          </div>
        </div>
      ) : count > 0 ? (
        <div className='flex items-center gap-3 py-4'>
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20'>
            <RefreshCw className='h-5 w-5 text-primary' />
          </div>
          <div>
            <p className='text-sm font-medium'><Trans>{count} remaining</Trans></p>
            <p className='text-muted-foreground text-xs'><Trans>Recovery codes</Trans></p>
          </div>
        </div>
      ) : (
        <EmptyState icon={RefreshCw} title={t`No recovery codes`} className='p-4' />
      )}
      <ConfirmDialog
        open={showGenerateDialog}
        onOpenChange={setShowGenerateDialog}
        title={count > 0 ? t`Regenerate?` : t`Generate?`}
        desc={t`Make sure to save the new codes.`}
        confirmText={t`Proceed`}
        handleConfirm={() => {
          void handleGenerate()
          setShowGenerateDialog(false)
        }}
      />
    </Section>
    {stepUp.dialog}
    </>
  )
}

// ============================================================================
// OAuth Section (third-party sign-in linking)
// ============================================================================

const oauthProviderOrder: OAuthProvider[] = [
  'facebook',
  'github',
  'google',
  'microsoft',
  'x',
]

/* eslint-disable lingui/no-unlocalized-strings -- OAuth provider names are proper nouns */
const oauthProviderLabel: Record<OAuthProvider, string> = {
  facebook: 'Facebook',
  github: 'GitHub',
  google: 'Google',
  microsoft: 'Microsoft',
  x: 'X',
}
/* eslint-enable lingui/no-unlocalized-strings */

// Guard against the one-shot toast firing more than once per OAuth callback.
function oauthResultKey(): string {
  return 'oauth_result_shown:' + window.location.search
}

function OauthIdentityRow({
  identity,
  onUnlink,
}: {
  identity: OAuthIdentity
  onUnlink: (provider: OAuthProvider) => void
}) {
  const { t } = useLingui()
  const { formatTimestamp } = useFormat()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  return (
    <TableRow>
      <TableCell>
        <span className='font-medium'>
          {oauthProviderLabel[identity.provider] ?? identity.provider}
        </span>
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {identity.email || '—'}
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {formatTimestamp(identity.used, t`Never`)}
      </TableCell>
      <TableCell className='text-end'>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => setShowDeleteDialog(true)}
          aria-label={t`Unlink provider`}
        >
          <Trash2 className='h-4 w-4' />
        </Button>
        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title={t`Unlink provider?`}
          desc={t`You won't be able to sign in with ${oauthProviderLabel[identity.provider] ?? identity.provider} anymore. Make sure you still have another way to log in.`}
          confirmText={t`Unlink`}
          destructive
          handleConfirm={() => {
            onUnlink(identity.provider)
            setShowDeleteDialog(false)
          }}
        />
      </TableCell>
    </TableRow>
  )
}

function OauthSection() {
  const { t } = useLingui()
  const identities = useOauthIdentities()
  const authMethods = useAuthMethods()
  const oauthBegin = useOauthBegin()
  const oauthUnlink = useOauthUnlink()

  const enabled = (authMethods.data as AuthMethodsResponse | undefined)?.oauth
  const linked = identities.data?.identities ?? []
  const linkedSet = new Set(linked.map((i) => i.provider))
  const availableToLink = oauthProviderOrder.filter(
    (p) => enabled?.[p] && !linkedSet.has(p)
  )

  const handleLink = async (provider: OAuthProvider) => {
    try {
      const { url } = await oauthBegin.mutateAsync({ provider, link: true })
      shellNavigateTop(url)
    } catch (error) {
      toast.error(getErrorMessage(error, t`Could not start linking`))
    }
  }

  const handleUnlink = async (provider: OAuthProvider) => {
    try {
      await oauthUnlink.mutateAsync(provider)
      toast.success(t`Unlinked ${oauthProviderLabel[provider] ?? provider}`)
    } catch (error) {
      toast.error(getErrorMessage(error, t`Could not unlink provider`))
    }
  }

  // If no providers are enabled server-side AND none are linked, omit the
  // whole card so it doesn't clutter the settings page.
  const anyEnabled =
    enabled &&
    (enabled.google ||
      enabled.github ||
      enabled.microsoft ||
      enabled.facebook ||
      enabled.x)
  if (!anyEnabled && linked.length === 0 && !identities.isLoading) {
    return null
  }

  const linkButton = availableToLink.length > 0 ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          disabled={oauthBegin.isPending}
        >
          <Plus className='me-2 h-4 w-4' />
          <Trans>Link account</Trans>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {availableToLink.map((provider) => (
          <DropdownMenuItem
            key={provider}
            onClick={() => handleLink(provider)}
          >
            {oauthProviderLabel[provider]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null

  return (
    <Section
      title={t`Third-party login`}
      action={linkButton}
    >
      {identities.error ? (
        <GeneralError
          error={identities.error}
          minimal
          mode='inline'
          reset={identities.refetch}
        />
      ) : identities.isLoading ? (
        <ListSkeleton variant='simple' height='h-10' count={2} />
      ) : linked.length === 0 ? (
        <EmptyState icon={Link2} title={t`No accounts linked`} className='p-4' />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><Trans>Provider</Trans></TableHead>
              <TableHead><Trans>Email</Trans></TableHead>
              <TableHead><Trans>Last used</Trans></TableHead>
              <TableHead className='w-16'></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linked.map((identity) => (
              <OauthIdentityRow
                key={identity.provider}
                identity={identity}
                onUnlink={handleUnlink}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </Section>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function UserLogin() {
  const { t } = useLingui()
  usePageTitle(t`Login`)

  // Read a one-shot OAuth callback result so the user sees a confirmation toast
  // after returning from a provider's consent page. Guarded against React
  // StrictMode double-mount so the toast fires exactly once per visit.
  useEffect(() => {
    const key = oauthResultKey()
    try { if (sessionStorage.getItem(key)) return } catch { /* ignore */ }
    const params = new URLSearchParams(window.location.search)
    const linked = params.get('oauth_linked')
    const errored = params.get('oauth_error')
    if (!linked && !errored) return
    try { sessionStorage.setItem(key, '1') } catch { /* ignore */ }

    // Defer by a tick so Sonner's Toaster has mounted and subscribed to the
    // toast store before we publish. Without this delay the toast is published
    // to zero subscribers (the effect runs before Toaster's sibling effect)
    // and is silently dropped.
    setTimeout(() => {
      if (linked) {
        toast.success(
          t`Linked ${oauthProviderLabel[linked as OAuthProvider] ?? linked}`
        )
      } else if (errored === 'already_linked') {
        toast.error(t`That account is already linked to another user`)
      } else if (errored === 'email_exists') {
        toast.error(t`That email is already registered to another account`)
      } else {
        toast.error(t`Could not link account`)
      }
    }, 0)
  }, [t])

  // The post-restore banner links here with #oauth to take the user
  // straight to re-linking. In the shell the page scrolls an inner
  // container, so native hash-scroll is unreliable; scroll the section
  // into view once it has rendered.
  useEffect(() => {
    if (window.location.hash !== '#oauth') return
    const timer = setTimeout(() => {
      document.getElementById('oauth')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      <PageHeader title={t`Login`} icon={<Lock className='size-4 md:size-5' />} />
      <Main>
        <div className='space-y-8 pb-6'>
          <LoginRequirementsSection />
          <PasskeysSection />
          <AuthenticatorSection />
          <div id='oauth' className='scroll-mt-20'>
            <OauthSection />
          </div>
          <RecoveryCodesSection />
        </div>
        <ServerDocumentsFooter />
      </Main>
    </>
  )
}
