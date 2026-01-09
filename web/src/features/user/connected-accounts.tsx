import { useState } from 'react'
import {
  Bell,
  Brain,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  MoreHorizontal,
  Plus,
  Server,
  Share2,
  Trash2,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Header,
  Main,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  AccountAdd,
  AccountVerify,
  useAccounts,
  usePageTitle,
  getErrorMessage,
  toast,
} from '@mochi/common'
import type { Account, Provider } from '@mochi/common'

const APP_BASE = '/settings'

// Capability badge styles
const CAPABILITY_STYLE: Record<string, string> = {
  notify: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  ai: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  mcp: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  social: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
  identity:
    'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
}

function getProviderIcon(type: string) {
  switch (type) {
    case 'email':
      return <Mail className='h-4 w-4' />
    case 'browser':
      return <Bell className='h-4 w-4' />
    case 'pushbullet':
      return (
        <svg className='h-4 w-4' viewBox='0 0 24 24' fill='currentColor'>
          <circle cx='12' cy='12' r='10' />
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

function getProviderLabel(providers: Provider[], type: string): string {
  const provider = providers.find((p) => p.type === type)
  return provider?.label || type
}

function getCapabilities(providers: Provider[], type: string): string[] {
  const provider = providers.find((p) => p.type === type)
  return provider?.capabilities || []
}

function formatDate(timestamp: number): string {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
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

function getAccountDisplayName(
  account: Account,
  providers: Provider[]
): string {
  // Use label if provided
  if (account.label) return account.label

  // For browser accounts, detect browser from endpoint
  if (account.type === 'browser') {
    return getBrowserFromEndpoint(account.identifier)
  }

  // For other accounts, use identifier (e.g., email address)
  if (account.identifier) return account.identifier

  // Fallback to provider label
  return getProviderLabel(providers, account.type)
}

function AccountRow({
  account,
  providers,
  onRemove,
  onVerify,
  isRemoving,
}: {
  account: Account
  providers: Provider[]
  onRemove: (id: number) => void
  onVerify: (account: Account) => void
  isRemoving: boolean
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const isVerified = account.verified > 0
  const provider = providers.find((p) => p.type === account.type)
  const needsVerification = provider?.verify && !isVerified
  const capabilities = getCapabilities(providers, account.type)

  const handleDelete = () => {
    onRemove(account.id)
    setShowDeleteDialog(false)
  }

  const displayName = getAccountDisplayName(account, providers)

  return (
    <TableRow>
      {/* Type */}
      <TableCell>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-full bg-muted'>
            {getProviderIcon(account.type)}
          </div>
          <span className='font-medium hidden sm:inline'>
            {getProviderLabel(providers, account.type)}
          </span>
        </div>
      </TableCell>

      {/* Name */}
      <TableCell>
        <div className='flex flex-col'>
          <span className='font-medium sm:font-normal'>{displayName}</span>
          <span className='text-muted-foreground text-xs sm:hidden'>
            {getProviderLabel(providers, account.type)}
          </span>
        </div>
      </TableCell>

      {/* Capabilities */}
      <TableCell className='hidden md:table-cell'>
        <div className='flex flex-wrap gap-1'>
          {capabilities.map((cap) => (
            <Badge
              key={cap}
              variant='secondary'
              className={`text-xs ${CAPABILITY_STYLE[cap] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}
            >
              {cap}
            </Badge>
          ))}
        </div>
      </TableCell>

      {/* Status */}
      <TableCell className='hidden sm:table-cell'>
        {needsVerification ? (
          <span className='inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400'>
            <Clock className='h-3 w-3' />
            Pending
          </span>
        ) : isVerified ? (
          <span className='inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400'>
            <CheckCircle2 className='h-3 w-3' />
            Verified
          </span>
        ) : (
          <span className='text-xs text-muted-foreground'>Connected</span>
        )}
      </TableCell>

      {/* Added */}
      <TableCell className='text-muted-foreground text-sm hidden lg:table-cell'>
        {formatDate(account.created)}
      </TableCell>

      {/* Actions */}
      <TableCell className='text-right'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='sm' disabled={isRemoving}>
              {isRemoving ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <MoreHorizontal className='h-4 w-4' />
              )}
              <span className='sr-only'>Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            {needsVerification && (
              <DropdownMenuItem onClick={() => onVerify(account)}>
                <Mail className='mr-2 h-4 w-4' />
                Verify
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className='text-destructive focus:text-destructive'
            >
              <Trash2 className='mr-2 h-4 w-4' />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove account?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the {getProviderLabel(providers, account.type)}{' '}
                account &quot;{displayName}&quot;. You can add it again later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}

export function ConnectedAccounts() {
  usePageTitle('Connected accounts')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [verifyAccount, setVerifyAccount] = useState<Account | null>(null)

  const {
    providers,
    accounts,
    isLoading,
    add,
    remove,
    verify,
    isAdding,
    isRemoving,
    isVerifying,
  } = useAccounts(APP_BASE)

  const handleAdd = async (type: string, fields: Record<string, string>) => {
    try {
      const account = await add(type, fields)
      toast.success('Account added')
      setIsAddOpen(false)

      // If verification is required, show verify dialog
      const provider = providers.find((p) => p.type === type)
      if (provider?.verify && account.verified === 0) {
        setVerifyAccount(account)
      }
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to add account')
      toast.error(message)
      throw error
    }
  }

  const handleRemove = async (id: number) => {
    try {
      await remove(id)
      toast.success('Account removed')
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to remove account')
      toast.error(message)
    }
  }

  const handleVerify = async (id: number, code: string) => {
    try {
      const result = await verify(id, code)
      if (result) {
        toast.success('Account verified')
        setVerifyAccount(null)
      } else {
        toast.error('Invalid verification code')
      }
    } catch (error) {
      const message = getErrorMessage(error, 'Verification failed')
      toast.error(message)
    }
  }

  const handleResend = async (id: number) => {
    try {
      await verify(id)
      toast.success('Verification code sent')
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to send verification code')
      toast.error(message)
    }
  }

  return (
    <>
      <Header compact>
        <div className='flex w-full items-center justify-between'>
          <h1 className='text-xl font-semibold'>Connected accounts</h1>
          <Button size='sm' onClick={() => setIsAddOpen(true)}>
            <Plus className='mr-2 h-4 w-4' />
            Add account
          </Button>
        </div>
      </Header>

      <Main>
        {isLoading ? (
          <div className='space-y-3'>
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
          </div>
        ) : accounts.length === 0 ? (
          <p className='text-muted-foreground text-sm'>No connected accounts.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-12 sm:w-auto'>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className='hidden md:table-cell'>
                  Capabilities
                </TableHead>
                <TableHead className='hidden sm:table-cell'>Status</TableHead>
                <TableHead className='hidden lg:table-cell'>Added</TableHead>
                <TableHead className='w-12'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  providers={providers}
                  onRemove={handleRemove}
                  onVerify={setVerifyAccount}
                  isRemoving={isRemoving}
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
    </>
  )
}
