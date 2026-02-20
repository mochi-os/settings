import { useState } from 'react'
import type { Token } from '@/types/account'
import { Loader2, Plus, Trash2, Copy, Check, Key } from 'lucide-react'
import { useTokens, useTokenCreate, useTokenDelete } from '@/hooks/use-account'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  usePageTitle,
  getErrorMessage,
  toast,
} from '@mochi/common'

function formatDate(dateStr: string): string {
  if (!dateStr) return 'Never'
  return dateStr
}

function TokenRow({ token }: { token: Token }) {
  const deleteToken = useTokenDelete()

  const handleDelete = () => {
    deleteToken.mutate(token.hash, {
      onSuccess: () => {
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
        {formatDate(token.created)}
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {formatDate(token.last_used)}
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {token.expires || 'Never'}
      </TableCell>
      <TableCell className='text-right'>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              disabled={deleteToken.isPending}
            >
              {deleteToken.isPending ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Trash2 className='h-4 w-4' />
              )}
              <span className='sr-only'>Delete token</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete token?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the token &quot;{token.name}&quot;.
                Any applications using this token will no longer be able to
                authenticate.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant='destructive' onClick={handleDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}

function CreateTokenDialog() {
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size='sm'>
          <Plus className='mr-2 h-4 w-4' />
          Create token
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {newToken ? 'Token created' : 'Create token'}
          </DialogTitle>
          <DialogDescription>
            {newToken
              ? 'Copy your token now. You will not be able to see it again.'
              : 'Create a token to authenticate with git or the API.'}
          </DialogDescription>
        </DialogHeader>

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
            <DialogFooter>
              <Button variant='outline' onClick={handleClose}>Done</Button>
            </DialogFooter>
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
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={createToken.isPending || !name.trim()}
              >
                {createToken.isPending && (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                )}
                Create token
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
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
        actions={<CreateTokenDialog />}
      />

      <Main>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Key className='h-5 w-5' />
              Authentication Tokens
            </CardTitle>
            <CardDescription>
              Manage API tokens for programmatic access
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <GeneralError error={error} minimal mode='inline' reset={refetch} />
            ) : isLoading ? (
              <ListSkeleton variant='simple' height='h-10' count={3} />
            ) : tokens.length === 0 ? (
              <EmptyState
                icon={Key}
                title='No authentication tokens'
                description='Create a token to authenticate with git or the API.'
                className='py-8'
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
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
