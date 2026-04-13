import { useState } from 'react'
import type { Token } from '@/types/account'
import { Loader2, Plus, Trash2, Copy, Check, Key } from 'lucide-react'
import { useTokens, useTokenCreate, useTokenDelete } from '@/hooks/use-account'
import {
  Button,
  ConfirmDialog,
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
  Input,
  Label,
  EmptyState,
  GeneralError,
  ListSkeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  PageHeader,
  Main,
  usePageTitle,
  getErrorMessage,
  toast,
} from '@mochi/web'


function TokenRow({ token }: { token: Token }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const deleteToken = useTokenDelete()

  const handleDelete = () => {
    deleteToken.mutate(token.hash, {
      onSuccess: () => {
        setShowDeleteDialog(false)
        toast.success('Token deleted')
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to delete token'))
      },
    })
  }

  return (
    <TableRow>
      <TableCell>
        <div className='flex flex-col'>
          <span className='font-medium'>{token.name}</span>
          {token.scopes && token.scopes.length > 0 && (
            <span className='text-muted-foreground text-xs'>
              Scopes: {token.scopes.join(', ')}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {token.created || 'Never'}
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {token.last_used || 'Never'}
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {token.expires || 'Never'}
      </TableCell>
      <TableCell className='text-right'>
        <Button
          variant='ghost'
          size='sm'
          disabled={deleteToken.isPending}
          onClick={() => setShowDeleteDialog(true)}
        >
          {deleteToken.isPending ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Trash2 className='h-4 w-4' />
          )}
          <span className='sr-only'>Delete token</span>
        </Button>
        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title='Delete token?'
          desc={`This will permanently delete the token "${token.name}". Any applications using this token will no longer be able to authenticate.`}
          confirmText='Delete'
          destructive
          handleConfirm={handleDelete}
          isLoading={deleteToken.isPending}
        />
      </TableCell>
    </TableRow>
  )
}

function CreateTokenDialog({ triggerClassName }: { triggerClassName?: string }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [newToken, setNewToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const createToken = useTokenCreate()

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error('Please enter a token name')
      return
    }

    createToken.mutate(
      { name: name.trim() },
      {
        onSuccess: (data) => {
          setNewToken(data.token)
          setName('')
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, 'Failed to create token'))
        },
      }
    )
  }

  const handleCopy = async () => {
    if (newToken) {
      await navigator.clipboard.writeText(newToken)
      setCopied(true)
      toast.success('Token copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setName('')
    setNewToken(null)
    setCopied(false)
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger asChild>
        <Button size='sm' variant='outline' className={triggerClassName}>
          <Plus className='mr-2 h-4 w-4' />
          Create token
        </Button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {newToken ? 'Token created' : 'Create token'}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {newToken
              ? 'Copy your token now. You will not be able to see it again.'
              : 'Create a token to authenticate with git or the API.'}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {newToken ? (
          <div className='space-y-4'>
            <div className='bg-muted flex items-center gap-2 rounded-md p-3 font-mono text-sm'>
              <code className='flex-1 break-all'>{newToken}</code>
              <Button
                variant='ghost'
                size='sm'
                onClick={handleCopy}
                className='shrink-0'
              >
                {copied ? (
                  <Check className='h-4 w-4' />
                ) : (
                  <Copy className='h-4 w-4' />
                )}
              </Button>
            </div>
            <ResponsiveDialogFooter>
              <Button variant='outline' onClick={handleClose}>Done</Button>
            </ResponsiveDialogFooter>
          </div>
        ) : (
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='token-name'>Token name</Label>
              <Input
                id='token-name'
                placeholder='My application'
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreate()
                  }
                }}
              />
            </div>
            <ResponsiveDialogFooter>
              <Button
                onClick={handleCreate}
                disabled={createToken.isPending || !name.trim()}
              >
                {createToken.isPending && (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                )}
                Create token
              </Button>
            </ResponsiveDialogFooter>
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

export function UserTokens() {
  usePageTitle('Authentication tokens')
  const { data, isLoading, error, refetch } = useTokens()

  const tokens = data?.tokens ?? []

  return (
    <>
      <PageHeader
        title="Authentication tokens"
        icon={<Key className='size-4 md:size-5' />}
        showSidebarTrigger
        actions={<CreateTokenDialog />}
      />

      <Main>
        {error ? (
          <GeneralError error={error} minimal mode='inline' reset={refetch} />
        ) : isLoading ? (
          <ListSkeleton variant='simple' height='h-10' count={3} />
        ) : tokens.length === 0 ? (
          <EmptyState
            icon={Key}
            title='No authentication tokens'
            className='p-4'
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className='w-12'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => (
                <TokenRow key={token.hash} token={token} />
              ))}
            </TableBody>
          </Table>
        )}
      </Main>
    </>
  )
}
