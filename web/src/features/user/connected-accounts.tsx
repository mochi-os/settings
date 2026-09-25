// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  Button,
  ConfirmDialog,
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  PageHeader,
  Input,
  Label,
  Main,
  EmptyState,
  GeneralError,
  ListSkeleton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  AccountAdd,
  AccountVerify,
  useAccounts,
  usePageTitle,
  getErrorMessage,
  getAppPath,
  getProviderLabel,
  requestHelpers,
  shellNavigateTop,
  toast,
  useFormat,
  type Account,
  type Provider,
  naturalCompare,
  textUnchanged,
} from '@mochi/web'
import {
  Bell,
  Brain,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  KeyRound,
  Link,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  Server,
  Share2,
  Smartphone,
  Trash2,
  Zap,
} from 'lucide-react'
import endpoints from '@/api/endpoints'
import { useOauthBegin } from '@/hooks/use-account'
import type { OAuthProvider } from '@/types/account'
import { useStepUp } from '@/lib/use-step-up'

const APP_BASE = getAppPath()

// A phone or tablet the user runs Mochi on. Its push account hangs off it, so
// the account is shown here as the device's transport rather than as a row of
// its own, and forgetting the device takes the account with it.
interface Device {
  id: string
  label: string
  created: number
  seen: number
}

function DevicesTable({
  devices,
  accounts,
  onForget,
  forgettingId,
}: {
  devices: Device[]
  accounts: Account[]
  onForget: (device: Device) => Promise<void>
  forgettingId: string | null
}) {
  const { t } = useLingui()
  const { formatTimestamp } = useFormat()
  const [forgetting, setForgetting] = useState<Device | null>(null)
  const rows = [...devices].sort((a, b) => naturalCompare(a.label, b.label))
  return (
    <>
      <h2 className='mb-2 text-base font-medium'>
        <Trans>Devices</Trans>
      </h2>
      <Table containerClassName='mb-6'>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Trans>Name</Trans>
            </TableHead>
            <TableHead>
              <Trans>Push</Trans>
            </TableHead>
            <TableHead>
              <Trans>Last seen</Trans>
            </TableHead>
            <TableHead className='w-24'></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((device) => {
            const push = accounts.filter((a) => a.device === device.id)
            return (
              <TableRow key={device.id}>
                <TableCell className='font-medium'>
                  {device.label || t`Device`}
                </TableCell>
                <TableCell className='text-muted-foreground'>
                  {push.map((a) => getProviderLabel(a.type)).join(', ')}
                </TableCell>
                <TableCell className='text-muted-foreground'>
                  {formatTimestamp(device.seen)}
                </TableCell>
                <TableCell className='text-end'>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={forgettingId === device.id}
                    onClick={() => setForgetting(device)}
                  >
                    <Trans>Forget</Trans>
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {forgetting && (
        <ConfirmDialog
          open={!!forgetting}
          onOpenChange={(open) => {
            if (!open) setForgetting(null)
          }}
          title={t`Forget device?`}
          desc={t`This will forget the device "${forgetting.label || t`Device`}" and stop notifications to it.`}
          confirmText={t`Forget`}
          destructive
          handleConfirm={async () => {
            const device = forgetting
            setForgetting(null)
            await onForget(device)
          }}
        />
      )}
    </>
  )
}

function getProviderIcon(type: string) {
  switch (type) {
    case 'email':
      return <Mail className='h-4 w-4' />
    case 'browser':
      return <Bell className='h-4 w-4' />
    case 'fcm':
    case 'unifiedpush':
      return <Smartphone className='h-4 w-4' />
    case 'pushbullet':
      return (
        <svg
          className='h-4 w-4'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
        >
          <circle cx='12' cy='12' r='9' />
        </svg>
      )
    case 'claude':
    case 'openai':
      return <Brain className='h-4 w-4' />
    case 'google':
    case 'microsoft':
    case 'github':
    case 'facebook':
    case 'x':
      return <KeyRound className='h-4 w-4' />
    case 'apple':
    case 'caldav':
      return <CalendarDays className='h-4 w-4' />
    case 'mcp':
      return <Server className='h-4 w-4' />
    default:
      return <Share2 className='h-4 w-4' />
  }
}

// The account types a provider's sign-in owns, and the ones that hold a
// calendar credential.
const OAUTH_TYPES = new Set(['google', 'microsoft', 'github', 'facebook', 'x'])
const CALENDAR_TYPES = new Set(['apple', 'caldav'])

// The words for each capability an account may hold, built per call so a
// language change is picked up (the same reason providerLabels is a function).
function capabilityLabel(capability: string): string {
  const labels: Record<string, string> = {
    login: i18n._(msg`Sign-in`),
    calendar: i18n._(msg`Calendar`),
    notify: i18n._(msg`Notifications`),
    ai: i18n._(msg`AI`),
    mcp: 'MCP',
  }
  return labels[capability] ?? capability
}

function getBrowserFromEndpoint(endpoint: string): string {
  // The named browsers are brands and stay verbatim; the fallback is ordinary
  // prose meaning "some browser we could not identify", so it is translated.
  // i18n._(msg`...`) rather than t`...` because this is not a component - the
  // same pattern the Email fallback below already uses.
  if (!endpoint) return i18n._(msg`Browser`)
  if (endpoint.includes('push.services.mozilla.com')) return 'Firefox'
  if (endpoint.includes('fcm.googleapis.com')) return 'Chrome'
  if (endpoint.includes('web.push.apple.com')) return 'Safari'
  if (endpoint.includes('wns.windows.com')) return 'Edge'
  if (endpoint.includes('push.api.opera.com')) return 'Opera'
  return i18n._(msg`Browser`)
}

function getAccountDisplayName(account: Account): string {
  // Use label if provided
  if (account.label) return account.label

  // For email accounts, show the email address
  if (account.type === 'email') {
    return account.identifier || i18n._(msg`Email`)
  }

  // For browser accounts, detect browser from endpoint
  if (account.type === 'browser') {
    return getBrowserFromEndpoint(account.identifier)
  }

  // For AI accounts, use provider label as the name
  if (account.type === 'claude' || account.type === 'openai') {
    return getProviderLabel(account.type)
  }

  // A provider's own account: the address it is held under, else the
  // provider's name.
  if (OAUTH_TYPES.has(account.type) || CALENDAR_TYPES.has(account.type)) {
    return account.identifier || getProviderLabel(account.type)
  }

  // Mobile-push tokens / UnifiedPush endpoints are 100+ char opaque strings
  // that overflow the row. Fall back to the provider label.
  if (account.type === 'fcm' || account.type === 'unifiedpush') {
    return getProviderLabel(account.type)
  }

  // For other accounts, use identifier
  if (account.identifier) return account.identifier

  // Fallback to provider label
  return getProviderLabel(account.type)
}

function AccountRow({
  account,
  providers,
  onRemove,
  onVerify,
  onSettings,
  onTest,
  onToggleEnabled,
  isRemoving,
  testingId,
}: {
  account: Account
  providers: Provider[]
  onRemove: (id: string) => void
  onVerify: (account: Account) => void
  onSettings: (account: Account) => void
  onTest: (id: string) => void
  onToggleEnabled: (id: string, enabled: boolean) => void
  isRemoving: boolean
  testingId: string | null
}) {
  const { t } = useLingui()
  const { formatTimestamp } = useFormat()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const isVerified = account.verified > 0
  // Defensive check to ensure providers is an array
  const providersList = Array.isArray(providers) ? providers : []
  const provider = providersList.find((p) => p.type === account.type)
  const needsVerification = provider?.verify && !isVerified
  const isAi = account.type === 'claude' || account.type === 'openai'
  // An account a provider's sign-in owns: it is not added or removed here, it
  // holds whatever the user consented to, and the Login page ends the sign-in.
  const isOauth = provider?.flow === 'oauth'
  const granted = account.granted ?? []
  const signInOnly = isOauth && granted.length === 1 && granted[0] === 'login'

  const handleDelete = () => {
    onRemove(account.id)
    setShowDeleteDialog(false)
  }

  const displayName = getAccountDisplayName(account)

  return (
    <TableRow>
      {/* Name */}
      <TableCell>
        <div className='flex items-center gap-3'>
          <div className='bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full'>
            {getProviderIcon(account.type)}
          </div>
          <div className='flex items-center gap-2'>
            <span>{displayName}</span>
            {isAi && account.default === 'ai' && (
              <span className='bg-primary/10 text-primary inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium'>
                <Trans>Default for AI</Trans>
              </span>
            )}
          </div>
        </div>
      </TableCell>

      {/* Type */}
      <TableCell>
        <span>
          {getProviderLabel(account.type)}
          {isAi &&
            account.identifier &&
            account.identifier !== 'default' &&
            ` - ${account.identifier}`}
        </span>
      </TableCell>

      {/* Status */}
      <TableCell>
        {isOauth && granted.length > 0 ? (
          <span className='text-muted-foreground text-xs'>
            {granted.map(capabilityLabel).join(', ')}
          </span>
        ) : needsVerification ? (
          <span className='inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400'>
            <Clock className='h-3 w-3' />
            <Trans>Pending</Trans>
          </span>
        ) : provider?.verify && isVerified ? (
          <span className='text-success inline-flex items-center gap-1 text-xs'>
            <CheckCircle2 className='h-3 w-3' />
            <Trans>Verified</Trans>
          </span>
        ) : (
          <span className='text-success inline-flex items-center gap-1 text-xs'>
            <CheckCircle2 className='h-3 w-3' />
            <Trans>Connected</Trans>
          </span>
        )}
      </TableCell>

      {/* Notify by default */}
      <TableCell>
        {provider?.capabilities?.includes('notify') && (
          <Switch
            checked={account.enabled > 0}
            onCheckedChange={(checked) => onToggleEnabled(account.id, checked)}
            aria-label={t`Notify by default`}
          />
        )}
      </TableCell>

      {/* Added */}
      <TableCell className='text-muted-foreground text-sm'>
        {formatTimestamp(account.created)}
      </TableCell>

      {/* Actions */}
      <TableCell className='text-end'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              loading={isRemoving || testingId === account.id}
              icon={<MoreHorizontal className='h-4 w-4' />}
            >
              <span className='sr-only'>
                <Trans>Actions</Trans>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            {needsVerification && (
              <DropdownMenuItem onClick={() => onVerify(account)}>
                <Mail className='me-2 h-4 w-4' />
                <Trans>Verify</Trans>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onTest(account.id)}>
              <Zap className='me-2 h-4 w-4' />
              <Trans>Test</Trans>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSettings(account)}>
              <Pencil className='me-2 h-4 w-4' />
              <Trans>Settings</Trans>
            </DropdownMenuItem>
            {!signInOnly && (
              <DropdownMenuItem onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className='me-2 h-4 w-4' />
                {isOauth ? (
                  <Trans>Revoke access</Trans>
                ) : (
                  <Trans>Remove</Trans>
                )}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title={isOauth ? t`Revoke access?` : t`Remove account?`}
          desc={
            isOauth
              ? t`This will revoke the calendar access of "${displayName}". Signing in with ${getProviderLabel(account.type)} stays until you unlink it on the Login page.`
              : t`This will remove the connected account "${displayName}".`
          }
          confirmText={isOauth ? t`Revoke access` : t`Remove`}
          destructive
          handleConfirm={handleDelete}
        />
      </TableCell>
    </TableRow>
  )
}

// Suppress the one-shot OAuth toast on React StrictMode's double mount. Module
// scope, not sessionStorage: the shell iframe partitions storage per load. The
// Login page keeps its own copy; neither exports it.
const oauthResultShown = new Set<string>()

const OAUTH_PROVIDERS: OAuthProvider[] = [
  'google',
  'github',
  'microsoft',
  'facebook',
  'x',
]

export function ConnectedAccounts() {
  const { t } = useLingui()
  usePageTitle(t`Connected accounts`)
  const stepUp = useStepUp()
  const oauthBegin = useOauthBegin()

  // The provider returns the browser here after a link, so this page says how
  // it went rather than leaving the result on the query alone.
  useEffect(() => {
    const key = 'oauth_result_shown:' + window.location.search
    if (oauthResultShown.has(key)) return
    const params = new URLSearchParams(window.location.search)
    const linked = params.get('oauth_linked')
    const errored = params.get('oauth_error')
    if (!linked && !errored) return
    oauthResultShown.add(key)

    // Deferred a tick: the toaster subscribes in a sibling effect, and a
    // message published before it has is dropped.
    setTimeout(() => {
      if (linked) {
        // Only a known provider is named: `linked` is a query parameter, so
        // falling back to it would put attacker-chosen text in a toast the
        // page presents as its own result.
        const label = OAUTH_PROVIDERS.includes(linked as OAuthProvider)
          ? getProviderLabel(linked)
          : undefined
        toast.success(label ? t`Linked ${label}` : t`Account linked`)
      } else if (errored === 'already_linked') {
        toast.error(t`That account is already linked to another user`)
      } else if (errored === 'email_exists') {
        toast.error(t`That email is already registered to another account`)
      } else {
        toast.error(t`Could not link account`)
      }
    }, 0)
  }, [t])
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [verifyAccount, setVerifyAccount] = useState<Account | null>(null)
  const [settingsAccount, setSettingsAccount] = useState<Account | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const {
    providers: providersData,
    accounts: accountsData,
    isLoading,
    providersError,
    accountsError,
    add,
    remove,
    update,
    verify,
    test,
    isAdding,
    isVerifying,
    refetch,
  } = useAccounts(APP_BASE)

  // Ensure arrays are always arrays (defensive check)
  const providers = Array.isArray(providersData) ? providersData : []
  const accounts = Array.isArray(accountsData) ? accountsData : []

  const queryClient = useQueryClient()
  const devicesQuery = useQuery({
    queryKey: ['notifications', 'devices'],
    queryFn: () =>
      requestHelpers.get<Device[]>(endpoints.notifications.devices),
  })
  const devices = Array.isArray(devicesQuery.data) ? devicesQuery.data : []
  const deviceIds = new Set(devices.map((d) => d.id))
  // An account bound to a listed device is that device's, shown in its row.
  const visibleAccounts = accounts.filter(
    (a) => !a.device || !deviceIds.has(a.device)
  )
  const [forgettingDeviceId, setForgettingDeviceId] = useState<string | null>(
    null
  )

  const handleForgetDevice = async (device: Device) => {
    setForgettingDeviceId(device.id)
    try {
      const params = new URLSearchParams()
      params.append('id', device.id)
      await requestHelpers.post(
        endpoints.notifications.devicesRemove,
        params.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      )
      toast.success(t`Device forgotten`)
      void queryClient.invalidateQueries({
        queryKey: ['notifications', 'devices'],
      })
      await refetch()
    } catch (error) {
      toast.error(getErrorMessage(error, t`Failed to forget device`))
    } finally {
      setForgettingDeviceId(null)
    }
  }

  const handleAdd = async (
    type: string,
    fields: Record<string, string>,
    addToExisting: boolean,
    setAsDefault?: boolean
  ) => {
    try {
      const account = await add(type, fields, addToExisting)
      if (setAsDefault) {
        await handleSetDefault(account.id, true)
      }
      toast.success(t`Account added`)
      setIsAddOpen(false)

      // If verification is required, show verify dialog
      const provider = providers.find((p) => p.type === type)
      if (provider?.verify && account.verified === 0) {
        setVerifyAccount(account)
      }
    } catch (error) {
      const message = getErrorMessage(error, t`Failed to add account`)
      toast.error(message)
      throw error
    }
  }

  // An OAuth account is made by linking the provider for sign-in, not by the
  // add form: re-authenticate, then hand the browser to the provider.
  const handleLink = (type: string) => {
    setIsAddOpen(false)
    stepUp.request(async (token) => {
      try {
        const { url } = await oauthBegin.mutateAsync({
          provider: type as OAuthProvider,
          link: true,
          token,
        })
        shellNavigateTop(url)
      } catch (error) {
        toast.error(getErrorMessage(error, t`Could not start linking`))
      }
    })
  }

  const handleRemove = async (id: string) => {
    // Per row, not the mutation's own isPending: that is shared, so removing
    // one account disabled and spun the menu on every other row too.
    setRemovingId(id)
    try {
      await remove(id)
      toast.success(t`Account removed`)
    } catch (error) {
      const message = getErrorMessage(error, t`Failed to remove account`)
      toast.error(message)
    } finally {
      setRemovingId(null)
    }
  }

  const handleVerify = async (id: string, code: string) => {
    try {
      const result = await verify(id, code)
      if (result) {
        toast.success(t`Account verified`)
        setVerifyAccount(null)
      } else {
        toast.error(t`Invalid verification code`)
      }
    } catch (error) {
      const message = getErrorMessage(error, t`Verification failed`)
      toast.error(message)
    }
  }

  const handleResend = async (id: string) => {
    try {
      await verify(id)
      toast.success(t`Verification code sent`)
    } catch (error) {
      const message = getErrorMessage(
        error,
        t`Failed to send verification code`
      )
      toast.error(message)
    }
  }

  const handleSaveSettings = async (
    id: string,
    fields: Record<string, string>
  ) => {
    try {
      await update(id, fields)
      toast.success(t`Account updated`)
    } catch (error) {
      const message = getErrorMessage(error, t`Failed to update account`)
      toast.error(message)
      throw error
    }
  }

  // No toast of its own: both callers (add, and the settings dialog's Save)
  // report the whole gesture themselves, so one here made two for one click.
  // Rethrows so the caller can stop rather than report success afterwards.
  const handleSetDefault = async (accountId: string, isDefault: boolean) => {
    try {
      await requestHelpers.post(endpoints.accounts.default, {
        account: accountId,
        type: isDefault ? 'ai' : '',
      })
      refetch()
    } catch (error) {
      toast.error(getErrorMessage(error, t`Failed to update default`))
      throw error
    }
  }

  const handleTest = async (id: string) => {
    setTestingId(id)
    try {
      const result = await test(id)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      const message = getErrorMessage(error, t`Test failed`)
      toast.error(message)
    } finally {
      setTestingId(null)
    }
  }

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await update(id, { enabled: enabled ? '1' : '0' })
    } catch (error) {
      const message = getErrorMessage(error, t`Failed to update account`)
      toast.error(message)
    }
  }

  return (
    <>
      <PageHeader
        title={t`Connected accounts`}
        icon={<Link className='size-4 md:size-5' />}
        actions={
          !providersError && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => setIsAddOpen(true)}
            >
              <Plus className='me-2 h-4 w-4' />
              <Trans>Add account</Trans>
            </Button>
          )
        }
      />

      <Main>
        {providersError ? (
          <GeneralError
            error={providersError}
            minimal
            mode='inline'
            reset={refetch}
          />
        ) : accountsError ? (
          <GeneralError
            error={accountsError}
            minimal
            mode='inline'
            reset={refetch}
          />
        ) : isLoading ? (
          <ListSkeleton variant='simple' height='h-12' count={3} />
        ) : (
          <>
            {devices.length > 0 && (
              <DevicesTable
                devices={devices}
                accounts={accounts}
                onForget={handleForgetDevice}
                forgettingId={forgettingDeviceId}
              />
            )}
            {visibleAccounts.length === 0 ? (
              <EmptyState
                icon={Link}
                title={t`No connected accounts`}
                className='p-4'
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Trans>Name</Trans>
                    </TableHead>
                    <TableHead>
                      <Trans>Type</Trans>
                    </TableHead>
                    <TableHead>
                      <Trans>Status</Trans>
                    </TableHead>
                    <TableHead>
                      <Trans>Notify by default</Trans>
                    </TableHead>
                    <TableHead>
                      <Trans>Added</Trans>
                    </TableHead>
                    <TableHead className='w-12'></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...visibleAccounts]
                    .sort((a, b) => {
                      const nameCompare = naturalCompare(
                        getAccountDisplayName(a),
                        getAccountDisplayName(b)
                      )
                      if (nameCompare !== 0) return nameCompare
                      return naturalCompare(
                        getProviderLabel(a.type),
                        getProviderLabel(b.type)
                      )
                    })
                    .map((account) => (
                      <AccountRow
                        key={account.id}
                        account={account}
                        providers={providers}
                        onRemove={handleRemove}
                        onVerify={setVerifyAccount}
                        onSettings={setSettingsAccount}
                        onTest={handleTest}
                        onToggleEnabled={handleToggleEnabled}
                        isRemoving={removingId === account.id}
                        testingId={testingId}
                      />
                    ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </Main>

      <AccountAdd
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        providers={providers}
        onAdd={handleAdd}
        onLink={handleLink}
        isAdding={isAdding}
        appBase={APP_BASE}
        hasExistingAiAccount={accounts.some(
          (a) =>
            (a.type === 'claude' || a.type === 'openai') && a.default === 'ai'
        )}
      />

      {verifyAccount && (
        <AccountVerify
          open={!!verifyAccount}
          onOpenChange={(open) => !open && setVerifyAccount(null)}
          account={verifyAccount}
          onVerify={handleVerify}
          onResend={handleResend}
          isVerifying={isVerifying}
        />
      )}

      {settingsAccount && (
        <AccountSettingsDialog
          account={settingsAccount}
          onOpenChange={(open) => {
            if (!open) setSettingsAccount(null)
          }}
          onSave={handleSaveSettings}
          onSetDefault={handleSetDefault}
        />
      )}

      {stepUp.dialog}
    </>
  )
}

function AccountSettingsDialog({
  account,
  onOpenChange,
  onSave,
  onSetDefault,
}: {
  account: Account
  onOpenChange: (open: boolean) => void
  onSave: (id: string, fields: Record<string, string>) => Promise<void>
  onSetDefault: (id: string, isDefault: boolean) => Promise<void>
}) {
  const { t } = useLingui()
  const [nameValue, setNameValue] = useState(
    account.label || getAccountDisplayName(account)
  )
  const [modelValue, setModelValue] = useState(
    account.identifier === 'default' ? '' : account.identifier || ''
  )
  const [isDefault, setIsDefault] = useState(account.default === 'ai')
  const isAi = account.type === 'claude' || account.type === 'openai'
  const modelPlaceholder = t`default`

  const origLabel = account.label || getAccountDisplayName(account)
  const origModel =
    account.identifier === 'default' ? '' : account.identifier || ''
  const origDefault = account.default === 'ai'

  const labelDirty = !textUnchanged(nameValue, origLabel)
  const modelDirty = isAi && !textUnchanged(modelValue, origModel)
  const defaultDirty = isAi && isDefault !== origDefault
  const settingsDirty = labelDirty || modelDirty
  const dialogDirty = settingsDirty || defaultDirty

  const handleSave = async () => {
    if (!dialogDirty) {
      onOpenChange(false)
      return
    }
    try {
      if (isAi && defaultDirty) {
        await onSetDefault(account.id, isDefault)
      }
      if (settingsDirty) {
        const fields: Record<string, string> = { label: nameValue }
        if (isAi) {
          fields.model = modelValue
        }
        await onSave(account.id, fields)
      }
    } catch {
      // Both handlers have already reported it; stay open so the entry survives.
      return
    }
    onOpenChange(false)
  }

  return (
    <ResponsiveDialog open onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className='sm:max-w-[425px]'>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            <Trans>Account settings</Trans>
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='settings-name'>
              <Trans>Name</Trans>
            </Label>
            <Input
              id='settings-name'
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
            />
          </div>
          {isAi && (
            <>
              <div className='grid gap-2'>
                <Label htmlFor='settings-model'>
                  <Trans>Model</Trans>
                </Label>
                <Input
                  id='settings-model'
                  value={modelValue}
                  onChange={(e) => setModelValue(e.target.value)}
                  placeholder={modelPlaceholder}
                />
              </div>
              <div className='flex items-center justify-between'>
                <Label htmlFor='settings-default'>
                  <Trans>Default AI account</Trans>
                </Label>
                <Switch
                  id='settings-default'
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                />
              </div>
            </>
          )}
        </div>
        <ResponsiveDialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button onClick={() => void handleSave()} disabled={!dialogDirty}>
            <Check className='size-4' />
            <Trans>Save</Trans>
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
