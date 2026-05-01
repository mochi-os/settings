import { useEffect, useState } from 'react'
import { useLingui, Trans } from '@lingui/react/macro'
import type {
  AuthMethodsResponse,
  OAuthIdentity,
  OAuthProvider,
  Passkey,
  TotpSetupResponse,
} from '@/types/account'
import { startRegistration } from '@simplewebauthn/browser'
import {
  Check,
  Key,
  Link2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  User,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import {
  useAccountData,
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
  useSetMethods,
  useTotpDisable,
  useTotpSetup,
  useTotpStatus,
  useTotpVerify,
  useUpdateIdentity,
} from '@/hooks/use-account'
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
  Switch,
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
  toast,
  useFormat,
  shellClipboardWrite,
} from '@mochi/web'

type RegistrationOptionsJSON = Parameters<typeof startRegistration>[0]['optionsJSON']

// ============================================================================
// Identity Section
// ============================================================================

function IdentitySection() {
  const { t } = useLingui()
  const { data, isLoading, error, refetch } = useAccountData()
  const updateIdentity = useUpdateIdentity()
  const [isRenaming, setIsRenaming] = useState(false)
  const [draftName, setDraftName] = useState('')

  const startRename = () => {
    setDraftName(data?.identity?.name ?? '')
    setIsRenaming(true)
  }

  const handleRename = () => {
    const name = draftName.trim()
    if (!name || name === data?.identity?.name) {
      setIsRenaming(false)
      return
    }
    updateIdentity.mutate(
      { name },
      {
        onSuccess: () => {
          toast.success(t`Name updated`)
          setIsRenaming(false)
        },
        onError: (err) => {
          toast.error(getErrorMessage(err, t`Failed to update name`))
        },
      }
    )
  }

  const handleTogglePublic = (checked: boolean) => {
    const privacy = checked ? 'public' : 'private'
    updateIdentity.mutate(
      { privacy },
      {
        onSuccess: () => {
          toast.success(
            privacy === 'public'
              ? t`Identity is now listed in the directory` : t`Identity is no longer listed in the directory`
          )
        },
        onError: (err) => {
          toast.error(getErrorMessage(err, t`Failed to update privacy`))
        },
      }
    )
  }

  return (
    <Section
      title={t`Identity`}
    >
      {error ? (
        <GeneralError error={error} minimal mode='inline' reset={refetch} />
      ) : isLoading ? (
        <ListSkeleton variant='simple' height='h-12' count={4} />
      ) : data?.identity ? (
        <div className='divide-y-0'>
          <FieldRow label={t`Name`}>
            {isRenaming ? (
              <div className='flex items-center gap-2'>
                <Input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className='h-8 w-64'
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename()
                    if (e.key === 'Escape') setIsRenaming(false)
                  }}
                  disabled={updateIdentity.isPending}
                />
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={handleRename}
                  disabled={updateIdentity.isPending}
                >
                  <Check className='h-4 w-4' />
                </Button>
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={() => setIsRenaming(false)}
                  disabled={updateIdentity.isPending}
                >
                  <Trans>Cancel</Trans>
                </Button>
              </div>
            ) : (
              <div className='flex items-center gap-2'>
                <span className='text-foreground text-base font-semibold'>
                  {data.identity.name}
                </span>
                <Button variant='ghost' size='sm' onClick={startRename}>
                  <Pencil className='h-4 w-4' />
                </Button>
              </div>
            )}
          </FieldRow>
          <FieldRow label={t`Username`}>
            <span className='text-foreground text-base'>
              {data.identity.username}
            </span>
          </FieldRow>
          <FieldRow label={t`Fingerprint`}>
            <DataChip value={data.identity.fingerprint} truncate='middle' />
          </FieldRow>
          <FieldRow label={t`Identity`}>
            <DataChip
              value={data.identity.entity}
              className='w-full'
              chipClassName='flex-1'
            />
          </FieldRow>
          <div className='flex items-center justify-between py-4 border-t border-border/40'>
            <Label htmlFor='identity-public' className='text-muted-foreground pr-4 text-sm font-medium'>
              <Trans>Allow others to find you in directory</Trans>
            </Label>
            <Switch
              id='identity-public'
              checked={data.identity.privacy === 'public'}
              onCheckedChange={handleTogglePublic}
              disabled={updateIdentity.isPending}
            />
          </div>
        </div>
      ) : null}
    </Section>
  )
}

// ============================================================================
// Login Requirements Section
// ============================================================================

function LoginRequirementsSection() {
  const { t } = useLingui()
  const { data: methodsData, isLoading, error, refetch } = useMethods()
  const { data: passkeysData, error: passkeysError } = usePasskeys()
  const { data: totpData, error: totpError } = useTotpStatus()
  const setMethods = useSetMethods()

  const methods = methodsData?.methods ?? ['email']
  const hasPasskey = passkeysError ? false : (passkeysData?.passkeys?.length ?? 0) > 0
  const hasTOTP = totpError ? false : (totpData?.enabled ?? false)

  const handleToggleMethod = (method: string, enabled: boolean) => {
    let newMethods: string[]
    if (enabled) {
      newMethods = [...methods, method]
    } else {
      newMethods = methods.filter((m) => m !== method)
    }
    // Ensure at least one method
    if (newMethods.length === 0) {
      newMethods = ['email']
    }

    setMethods.mutate(newMethods, {
      onSuccess: () => {
        toast.success(t`Login requirements updated`)
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, t`Failed to update login requirements`))
      },
    })
  }

  return (
    <Section
      title={t`Login requirements`}
    >
      {error ? (
        <GeneralError error={error} minimal mode='inline' reset={refetch} />
      ) : isLoading ? (
        <ListSkeleton variant='simple' height='h-16' count={3} />
      ) : (
        <div className='space-y-0 divide-y-0'>
          <div className='flex items-center justify-between py-4 border-b border-border/40'>
            <div className='space-y-1 pr-4'>
              <Label htmlFor='method-passkey' className='text-sm font-medium'>
                <Trans>Passkey</Trans>
              </Label>
              <p className='text-muted-foreground text-xs leading-relaxed'>
                {hasPasskey
                  ? t`Use a registered passkey to sign in` : t`Register a passkey below to enable`}
              </p>
            </div>
            <Switch
              id='method-passkey'
              checked={methods.includes('passkey')}
              onCheckedChange={(checked) =>
                handleToggleMethod('passkey', checked)
              }
              disabled={setMethods.isPending || !hasPasskey}
            />
          </div>

          <div className='flex items-center justify-between py-4 border-b border-border/40'>
            <div className='space-y-1 pr-4'>
              <Label htmlFor='method-totp' className='text-sm font-medium'>
                <Trans>Authenticator app</Trans>
              </Label>
              <p className='text-muted-foreground text-xs leading-relaxed'>
                {hasTOTP
                  ? t`Use an authenticator app code to sign in` : t`Set up an authenticator below to enable`}
              </p>
            </div>
            <Switch
              id='method-totp'
              checked={methods.includes('totp')}
              onCheckedChange={(checked) => handleToggleMethod('totp', checked)}
              disabled={setMethods.isPending || !hasTOTP}
            />
          </div>

          <div className='flex items-center justify-between py-4'>
            <div className='space-y-1 pr-4'>
              <Label htmlFor='method-email' className='text-sm font-medium'>
                <Trans>Email code</Trans>
              </Label>
              <p className='text-muted-foreground text-xs leading-relaxed'>
                <Trans>Receive a verification code by email</Trans>
              </p>
            </div>
            <Switch
              id='method-email'
              checked={methods.includes('email')}
              onCheckedChange={(checked) =>
                handleToggleMethod('email', checked)
              }
              disabled={
                setMethods.isPending ||
                (methods.length === 1 && methods.includes('email'))
              }
            />
          </div>
        </div>
      )}
    </Section>
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
            <Button size='sm' variant='ghost' onClick={handleRename}>
              <Check className='h-4 w-4' />
            </Button>
          </div>
        ) : (
          <span className='font-medium'>{passkey.name}</span>
        )}
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {formatTimestamp(passkey.created, 'Never')}
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {formatTimestamp(passkey.last_used, 'Never')}
      </TableCell>
      <TableCell className='text-right'>
        <div className='flex justify-end gap-1'>
          <Button variant='ghost' size='sm' onClick={() => setIsRenaming(true)}>
            <Pencil className='h-4 w-4' />
          </Button>
          <Button variant='ghost' size='sm' onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className='h-4 w-4' />
          </Button>
          <ConfirmDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            title={t`Delete passkey?`}
            desc={`This will remove "${passkey.name}" from your account. You won't be able to use it to sign in anymore.`}
            confirmText='Delete'
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
  const registerBegin = usePasskeyRegisterBegin()
  const registerFinish = usePasskeyRegisterFinish()
  const renamePasskey = usePasskeyRename()
  const deletePasskey = usePasskeyDelete()
  const [isRegistering, setIsRegistering] = useState(false)
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false)
  const [passkeyName, setPasskeyName] = useState('')

  const handleRegister = async () => {
    setIsRegistering(true)
    try {
      const beginResult = await registerBegin.mutateAsync()
      const credential = await startRegistration({
        optionsJSON: beginResult.options as RegistrationOptionsJSON,
      })
      await registerFinish.mutateAsync({
        ceremony: beginResult.ceremony,
        credential,
        name: passkeyName || 'Passkey',
      })
      toast.success(t`Passkey registered`)
      setRegisterDialogOpen(false)
      setPasskeyName('')
    } catch (error) {
      if (error instanceof Error && error.name === 'NotAllowedError') {
        toast.error(t`Registration cancelled`)
      } else {
        toast.error(getErrorMessage(error, t`Failed to register passkey`))
      }
    } finally {
      setIsRegistering(false)
    }
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
      >
        <Plus className='mr-2 h-4 w-4' />
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
            Register
            {isRegistering && (
              <Loader2 className='ml-2 h-4 w-4 animate-spin' />
            )}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )

  return (
    <Section
      title={t`Passkeys`}
      action={addButton}
    >
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
  const [setupData, setSetupData] = useState<TotpSetupResponse | null>(null)
  const [showDisableDialog, setShowDisableDialog] = useState(false)
  const [verifyCode, setVerifyCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  const handleSetup = async () => {
    try {
      const result = await setupTotp.mutateAsync()
      setSetupData(result)
    } catch (error) {
      toast.error(getErrorMessage(error, t`Failed to set up authenticator`))
    }
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
    disableTotp.mutate(undefined, {
      onSuccess: () => toast.success(t`Authenticator app disabled`),
      onError: (error) => toast.error(getErrorMessage(error, t`Failed to disable authenticator`)),
    })
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
        <Trash2 className='mr-2 h-4 w-4' />
        <Trans>Disable</Trans>
      </Button>
    ) : (
      <Button
        variant='outline'
        size='sm'
        onClick={handleSetup}
        disabled={setupTotp.isPending}
      >
        <Plus className='mr-2 h-4 w-4' />
        <Trans>Set up</Trans>
      </Button>
    )

  return (
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
            <p className='text-sm font-medium'>1. Scan QR Code</p>
            <div className='flex justify-center rounded-xl border-2 bg-white p-6 shadow-sm'>
              <QRCodeSVG value={setupData.url} size={200} />
            </div>
          </div>
          <div className='space-y-2.5'>
            <Label className='text-sm font-medium'>2. Manual Entry</Label>
            <DataChip value={setupData.secret} chipClassName='flex-1' />
          </div>
          <div className='border-t pt-6 space-y-4'>
            <p className='text-sm font-medium'>3. Verify Code</p>
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
                Verify & Enable
                {isVerifying && <Loader2 className='ml-2 h-4 w-4 animate-spin' />}
              </Button>
              <Button variant='ghost' onClick={() => setSetupData(null)}><Trans>Cancel</Trans></Button>
            </div>
          </div>
        </div>
      ) : isEnabled ? (
        <div className='flex items-center gap-3 py-4'>
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30'>
            <Check className='h-5 w-5 text-green-600 dark:text-green-500' />
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
        desc='This will remove the app from your account.'
        confirmText='Disable'
        destructive
        handleConfirm={() => {
          handleDisable()
          setShowDisableDialog(false)
        }}
      />
    </Section>
  )
}

// ============================================================================
// Recovery codes section
// ============================================================================

function RecoveryCodesSection() {
  const { t } = useLingui()
  const { data, isLoading, error, refetch } = useRecoveryStatus()
  const generateCodes = useRecoveryGenerate()
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [showCodes, setShowCodes] = useState<string[] | null>(null)

  const handleGenerate = async () => {
    try {
      const result = await generateCodes.mutateAsync()
      setShowCodes(result.codes)
    } catch (error) {
      toast.error(getErrorMessage(error, t`Failed to generate codes`))
    }
  }

  const count = data?.count ?? 0

  const action = showCodes ? null : (
    <Button
      variant='outline'
      size='sm'
      onClick={() => setShowGenerateDialog(true)}
    >
      {count > 0 ? (
        <RefreshCw className='mr-2 h-4 w-4' />
      ) : (
        <Plus className='mr-2 h-4 w-4' />
      )}
      {count > 0 ? t`Regenerate` : t`Generate`}
    </Button>
  )

  return (
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
            }}><Trans>Copy all</Trans></Button>
            <Button variant='ghost' size='sm' onClick={() => setShowCodes(null)}><Trans>Done</Trans></Button>
          </div>
        </div>
      ) : count > 0 ? (
        <div className='flex items-center gap-3 py-4'>
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20'>
            <RefreshCw className='h-5 w-5 text-primary' />
          </div>
          <div>
            <p className='text-sm font-medium'>{count} remaining</p>
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
        desc='Make sure to save the new codes.'
        confirmText='Proceed'
        handleConfirm={() => {
          void handleGenerate()
          setShowGenerateDialog(false)
        }}
      />
    </Section>
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

const oauthProviderLabel: Record<OAuthProvider, string> = {
  facebook: 'Facebook',
  github: 'GitHub',
  google: 'Google',
  microsoft: 'Microsoft',
  x: 'X',
}

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
        {formatTimestamp(identity.used, 'Never')}
      </TableCell>
      <TableCell className='text-right'>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className='h-4 w-4' />
        </Button>
        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title={t`Unlink provider?`}
          desc={`You won't be able to sign in with ${oauthProviderLabel[identity.provider] ?? identity.provider} anymore. Make sure you still have another way to log in.`}
          confirmText='Unlink'
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
      toast.success(`Unlinked ${oauthProviderLabel[provider] ?? provider}`)
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
          <Plus className='mr-2 h-4 w-4' />
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

export function UserAccount() {
  const { t } = useLingui()
  usePageTitle(t`Account`)

  // Read a one-shot OAuth callback result so the user sees a confirmation toast
  // after returning from a provider's consent page. Guarded against React
  // StrictMode double-mount so the toast fires exactly once per visit.
  useEffect(() => {
    const key = oauthResultKey()
    try { if (sessionStorage.getItem(key)) return } catch {}
    const params = new URLSearchParams(window.location.search)
    const linked = params.get('oauth_linked')
    const errored = params.get('oauth_error')
    if (!linked && !errored) return
    try { sessionStorage.setItem(key, '1') } catch {}

    // Defer by a tick so Sonner's Toaster has mounted and subscribed to the
    // toast store before we publish. Without this delay the toast is published
    // to zero subscribers (UserAccount's effect runs before Toaster's sibling
    // effect) and is silently dropped.
    setTimeout(() => {
      if (linked) {
        toast.success(
          `Linked ${oauthProviderLabel[linked as OAuthProvider] ?? linked}`
        )
      } else if (errored === 'already_linked') {
        toast.error(t`That account is already linked to another user`)
      } else if (errored === 'email_exists') {
        toast.error(t`That email is already registered to another account`)
      } else {
        toast.error(t`Could not link account`)
      }
    }, 0)
  }, [])

  return (
    <>
      <PageHeader title={t`Account`} icon={<User className='size-4 md:size-5' />} />
      <Main>
        <div className='space-y-8 pb-10'>
          <IdentitySection />
          <LoginRequirementsSection />
          <PasskeysSection />
          <AuthenticatorSection />
          <RecoveryCodesSection />
          <OauthSection />
        </div>
      </Main>
    </>
  )
}
