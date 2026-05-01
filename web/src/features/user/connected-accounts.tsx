import { useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  Bell,
  Brain,
  CheckCircle2,
  Clock,
  Link,
  Loader2,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  Server,
  Share2,
  Trash2,
  Zap,
} from 'lucide-react'
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
  toast,
  useFormat,
  type Account,
  type Provider, naturalCompare,} from '@mochi/web'

const APP_BASE = getAppPath()

function getProviderIcon(type: string) {
  switch (type) {
    case 'email':
      return <Mail className='h-4 w-4' />
    case 'browser':
      return <Bell className='h-4 w-4' />
    case 'pushbullet':
      return (
        <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
          <circle cx='12' cy='12' r='9' />
        </svg>
      )
    case 'claude':
    case 'openai':
      return <Brain className='h-4 w-4' />
    case 'mcp':
      return <Server className='h-4 w-4' />
    default:
      return <Share2 className='h-4 w-4' />
  }
}


function getBrowserFromEndpoint(endpoint: string): string {
  if (!endpoint) return 'Browser'
  if (endpoint.includes('push.services.mozilla.com')) return 'Firefox'
  if (endpoint.includes('fcm.googleapis.com')) return 'Chrome'
  if (endpoint.includes('web.push.apple.com')) return 'Safari'
  if (endpoint.includes('wns.windows.com')) return 'Edge'
  if (endpoint.includes('push.api.opera.com')) return 'Opera'
  return 'Browser'
}

function getAccountDisplayName(account: Account): string {
  // Use label if provided
  if (account.label) return account.label

  // For email accounts, show the email address
  if (account.type === 'email') {
    return account.identifier || 'Email'
  }

  // For browser accounts, detect browser from endpoint
  if (account.type === 'browser') {
    return getBrowserFromEndpoint(account.identifier)
  }

  // For AI accounts, use provider label as the name
  if (account.type === 'claude' || account.type === 'openai') {
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
  onRemove: (id: number) => void
  onVerify: (account: Account) => void
  onSettings: (account: Account) => void
  onTest: (id: number) => void
  onToggleEnabled: (id: number, enabled: boolean) => void
  isRemoving: boolean
  testingId: number | null
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
          <div className='flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0'>
            {getProviderIcon(account.type)}
          </div>
          <div className='flex flex-col'>
            <div className='flex items-center gap-2'>
              <span className='font-medium sm:font-normal'>{displayName}</span>
              {isAi && account.default === 'ai' && (
                <span className='inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'>
                  <Trans>Default</Trans>
                </span>
              )}
            </div>
            <span className='text-muted-foreground text-xs sm:hidden'>
              {getProviderLabel(account.type)}
              {isAi && account.identifier && ` - ${account.identifier}`}
            </span>
          </div>
        </div>
      </TableCell>

      {/* Type */}
      <TableCell className='hidden sm:table-cell'>
        <span>
          {getProviderLabel(account.type)}
          {isAi && account.identifier && ` - ${account.identifier}`}
        </span>
      </TableCell>

      {/* Status */}
      <TableCell className='hidden sm:table-cell'>
        {needsVerification ? (
          <span className='inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400'>
            <Clock className='h-3 w-3' />
            <Trans>Pending</Trans>
          </span>
        ) : provider?.verify && isVerified ? (
          <span className='inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400'>
            <CheckCircle2 className='h-3 w-3' />
            <Trans>Verified</Trans>
          </span>
        ) : (
          <span className='inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400'>
            <CheckCircle2 className='h-3 w-3' />
            <Trans>Connected</Trans>
          </span>
        )}
      </TableCell>

      {/* Notify by default */}
      <TableCell className='hidden md:table-cell'>
        {provider?.capabilities?.includes('notify') && (
          <Switch
            checked={account.enabled > 0}
            onCheckedChange={(checked) => onToggleEnabled(account.id, checked)}
            aria-label={t`Notify by default`}
          />
        )}
      </TableCell>

      {/* Added */}
      <TableCell className='text-muted-foreground text-sm hidden lg:table-cell'>
        {formatTimestamp(account.created)}
      </TableCell>

      {/* Actions */}
      <TableCell className='text-end'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='sm' disabled={isRemoving || testingId === account.id}>
              {isRemoving || testingId === account.id ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <MoreHorizontal className='h-4 w-4' />
              )}
              <span className='sr-only'><Trans>Actions</Trans></span>
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
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className='me-2 h-4 w-4' />
              <Trans>Remove</Trans>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title={t`Remove account?`}
          desc={`This will remove the connected account "${displayName}".`}
          confirmText='Remove'
          destructive
          handleConfirm={handleDelete}
        />
      </TableCell>
    </TableRow>
  )
}

export function ConnectedAccounts() {
  const { t } = useLingui()
  usePageTitle(t`Connected accounts`)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [verifyAccount, setVerifyAccount] = useState<Account | null>(null)
  const [settingsAccount, setSettingsAccount] = useState<Account | null>(null)
  const [testingId, setTestingId] = useState<number | null>(null)

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
    isRemoving,
    isVerifying,
    refetch,
  } = useAccounts(APP_BASE)

  // Ensure arrays are always arrays (defensive check)
  const providers = Array.isArray(providersData) ? providersData : []
  const accounts = Array.isArray(accountsData) ? accountsData : []

  const handleAdd = async (type: string, fields: Record<string, string>, addToExisting: boolean, setAsDefault?: boolean) => {
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

  const handleRemove = async (id: number) => {
    try {
      await remove(id)
      toast.success(t`Account removed`)
    } catch (error) {
      const message = getErrorMessage(error, t`Failed to remove account`)
      toast.error(message)
    }
  }

  const handleVerify = async (id: number, code: string) => {
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

  const handleResend = async (id: number) => {
    try {
      await verify(id)
      toast.success(t`Verification code sent`)
    } catch (error) {
      const message = getErrorMessage(error, t`Failed to send verification code`)
      toast.error(message)
    }
  }

  const handleSaveSettings = async (id: number, fields: Record<string, string>) => {
    try {
      await update(id, fields)
      toast.success(t`Account updated`)
    } catch (error) {
      const message = getErrorMessage(error, t`Failed to update account`)
      toast.error(message)
    }
  }

  const handleSetDefault = async (accountId: number, isDefault: boolean) => {
    try {
      const formData = new URLSearchParams()
      formData.append('account', String(accountId))
      formData.append('type', isDefault ? 'ai' : '')
      await requestHelpers.post(`${APP_BASE}/-/accounts/default`, formData.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      refetch()
    } catch (error) {
      toast.error(getErrorMessage(error, t`Failed to update default`))
    }
  }

  const handleTest = async (id: number) => {
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

  const handleToggleEnabled = async (id: number, enabled: boolean) => {
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
        showSidebarTrigger
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
          <GeneralError error={providersError} minimal mode='inline' reset={refetch} />
        ) : accountsError ? (
          <GeneralError error={accountsError} minimal mode='inline' reset={refetch} />
        ) : isLoading ? (
          <ListSkeleton variant='simple' height='h-12' count={3} />
        ) : accounts.length === 0 ? (
          <EmptyState
            icon={Link}
            title={t`No connected accounts`}
            className='p-4'
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Trans>Name</Trans></TableHead>
                <TableHead className='hidden sm:table-cell'><Trans>Type</Trans></TableHead>
                <TableHead className='hidden sm:table-cell'><Trans>Status</Trans></TableHead>
                <TableHead className='hidden md:table-cell'>
                  <Trans>Notify by default</Trans>
                </TableHead>
                <TableHead className='hidden lg:table-cell'><Trans>Added</Trans></TableHead>
                <TableHead className='w-12'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...accounts]
                .sort((a, b) => {
                  const nameCompare = naturalCompare(getAccountDisplayName(a), getAccountDisplayName(b))
                  if (nameCompare !== 0) return nameCompare
                  return naturalCompare(getProviderLabel(a.type), getProviderLabel(b.type))
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
                    isRemoving={isRemoving}
                    testingId={testingId}
                  />
                ))}
            </TableBody>
          </Table>
        )}
      </Main>

      <AccountAdd
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        providers={providers}
        onAdd={handleAdd}
        isAdding={isAdding}
        appBase={APP_BASE}
        hasExistingAiAccount={accounts.some((a) => (a.type === 'claude' || a.type === 'openai') && a.default === 'ai')}
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
          onOpenChange={(open) => { if (!open) setSettingsAccount(null) }}
          onSave={handleSaveSettings}
          onSetDefault={handleSetDefault}
        />
      )}
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
  onSave: (id: number, fields: Record<string, string>) => Promise<void>
  onSetDefault: (id: number, isDefault: boolean) => Promise<void>
}) {
  const [nameValue, setNameValue] = useState(account.label || getAccountDisplayName(account))
  const [modelValue, setModelValue] = useState(account.identifier === 'default' ? '' : account.identifier || '')
  const [isDefault, setIsDefault] = useState(account.default === 'ai')
  const isAi = account.type === 'claude' || account.type === 'openai'

  const handleSave = async () => {
    const fields: Record<string, string> = { label: nameValue }
    if (isAi) {
      fields.model = modelValue
      if (isDefault !== (account.default === 'ai')) {
        await onSetDefault(account.id, isDefault)
      }
    }
    await onSave(account.id, fields)
    onOpenChange(false)
  }

  return (
    <ResponsiveDialog open onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className='sm:max-w-[425px]'>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle><Trans>Account settings</Trans></ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='settings-name'><Trans>Name</Trans></Label>
            <Input
              id='settings-name'
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
            />
          </div>
          {isAi && (
            <>
              <div className='grid gap-2'>
                <Label htmlFor='settings-model'><Trans>Model</Trans></Label>
                <Input
                  id='settings-model'
                  value={modelValue}
                  onChange={(e) => setModelValue(e.target.value)}
                  placeholder='default'
                />
              </div>
              <div className='flex items-center justify-between'>
                <Label htmlFor='settings-default'><Trans>Default AI account</Trans></Label>
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
          <Button onClick={() => void handleSave()}><Trans>Save</Trans></Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
