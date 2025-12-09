import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import type { User, Session } from '@/types/users'
import {
  Ban,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Key,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  User as UserIcon,
  UserCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useSystemUsersData,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useSuspendUser,
  useActivateUser,
  useSetMfaRequired,
  useUserSessions,
  useRevokeUserSessions,
} from '@/hooks/use-system-users'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

function CreateUserDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [role, setRole] = useState('user')
  const createUser = useCreateUser()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createUser.mutate(
      { username, role },
      {
        onSuccess: () => {
          toast.success('User created')
          setOpen(false)
          setUsername('')
          setRole('user')
          onSuccess()
        },
        onError: (error: Error) => {
          toast.error(error.message || 'Failed to create user')
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className='mr-2 h-4 w-4' />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Add a new user to the system.</DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='username'>Email</Label>
              <Input
                id='username'
                type='email'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder='user@example.com'
                required
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='role'>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='administrator'>Administrator</SelectItem>
                  <SelectItem value='user'>User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={createUser.isPending}>
              {createUser.isPending && (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              )}
              Create User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditUserDialog({
  user,
  onSuccess,
}: {
  user: User
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState(user.username)
  const [role, setRole] = useState(user.role)
  const updateUser = useUpdateUser()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateUser.mutate(
      { id: user.id, username, role },
      {
        onSuccess: () => {
          toast.success('User updated')
          setOpen(false)
          onSuccess()
        },
        onError: (error: Error) => {
          toast.error(error.message || 'Failed to update user')
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Pencil className='mr-2 h-4 w-4' />
          Edit User
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details.</DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='edit-username'>Email</Label>
              <Input
                id='edit-username'
                type='email'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='edit-role'>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='administrator'>Administrator</SelectItem>
                  <SelectItem value='user'>User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={updateUser.isPending}>
              {updateUser.isPending && (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SessionsDialog({ user }: { user: User }) {
  const [open, setOpen] = useState(false)
  const { data, isLoading, refetch } = useUserSessions(user.id)
  const revokeSession = useRevokeUserSessions()

  const handleRevoke = (code?: string) => {
    revokeSession.mutate(
      { id: user.id, code },
      {
        onSuccess: (result) => {
          toast.success(
            code
              ? 'Session revoked'
              : `Revoked ${result.revoked} session${result.revoked !== 1 ? 's' : ''}`
          )
          refetch()
        },
        onError: (error: Error) => {
          toast.error(error.message || 'Failed to revoke session')
        },
      }
    )
  }

  const formatSession = (session: Session) => {
    const agent = session.agent || 'Unknown device'
    const browser = agent.includes('Chrome')
      ? 'Chrome'
      : agent.includes('Firefox')
        ? 'Firefox'
        : agent.includes('Safari')
          ? 'Safari'
          : 'Unknown browser'
    return browser
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Key className='mr-2 h-4 w-4' />
          Manage Sessions
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Sessions for {user.username}</DialogTitle>
          <DialogDescription>
            View and revoke active sessions for this user.
          </DialogDescription>
        </DialogHeader>
        <div className='py-4'>
          {isLoading ? (
            <div className='space-y-2'>
              <Skeleton className='h-12 w-full' />
              <Skeleton className='h-12 w-full' />
            </div>
          ) : data?.sessions && data.sessions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Last Accessed</TableHead>
                  <TableHead className='w-[80px]' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sessions.map((session) => (
                  <TableRow key={session.code}>
                    <TableCell>{formatSession(session)}</TableCell>
                    <TableCell className='font-mono text-sm'>
                      {session.address || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(session.accessed * 1000, {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleRevoke(session.code)}
                        disabled={revokeSession.isPending}
                      >
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className='text-muted-foreground py-4 text-center text-sm'>
              No active sessions
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)}>
            Close
          </Button>
          {data?.sessions && data.sessions.length > 0 && (
            <Button
              variant='destructive'
              onClick={() => handleRevoke()}
              disabled={revokeSession.isPending}
            >
              {revokeSession.isPending && (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              )}
              Revoke All Sessions
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function UserRow({ user, onUpdate }: { user: User; onUpdate: () => void }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const deleteUser = useDeleteUser()
  const suspendUser = useSuspendUser()
  const activateUser = useActivateUser()
  const setMfaRequired = useSetMfaRequired()

  const isAdmin = user.role === 'administrator'
  const isSuspended = user.status === 'suspended'
  const hasMfa = user.methods && user.methods !== 'email'

  const handleDelete = () => {
    deleteUser.mutate(user.id, {
      onSuccess: () => {
        toast.success('User deleted')
        setDeleteOpen(false)
        onUpdate()
      },
      onError: (error: Error) => {
        toast.error(error.message || 'Failed to delete user')
      },
    })
  }

  const handleToggleStatus = () => {
    const action = isSuspended ? activateUser : suspendUser
    action.mutate(user.id, {
      onSuccess: () => {
        toast.success(isSuspended ? 'User activated' : 'User suspended')
        onUpdate()
      },
      onError: (error: Error) => {
        toast.error(error.message || 'Failed to update user status')
      },
    })
  }

  const handleToggleMfaRequired = () => {
    setMfaRequired.mutate(
      { id: user.id, required: !user.mfa_required },
      {
        onSuccess: () => {
          toast.success(
            user.mfa_required
              ? 'MFA requirement cleared'
              : 'MFA now required for this user'
          )
          onUpdate()
        },
        onError: (error: Error) => {
          toast.error(error.message || 'Failed to update MFA requirement')
        },
      }
    )
  }

  return (
    <TableRow className={isSuspended ? 'opacity-60' : ''}>
      <TableCell>
        <div className='flex items-center gap-2'>
          {isAdmin ? (
            <Shield className='h-4 w-4 text-amber-500' />
          ) : (
            <UserIcon className='text-muted-foreground h-4 w-4' />
          )}
          <span className='font-medium'>{user.username}</span>
          {hasMfa && (
            <span title='MFA enabled'>
              <ShieldCheck className='h-4 w-4 text-green-600' />
            </span>
          )}
          {user.mfa_required && !hasMfa && (
            <Badge
              variant='outline'
              className='ml-1 border-amber-600 text-xs text-amber-600'
            >
              MFA Required
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={isAdmin ? 'default' : 'secondary'}>
          {isAdmin ? 'Administrator' : 'User'}
        </Badge>
      </TableCell>
      <TableCell>
        {isSuspended ? (
          <Badge variant='destructive'>Suspended</Badge>
        ) : (
          <Badge variant='outline'>Active</Badge>
        )}
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {user.last_login ? (
          formatDistanceToNow(user.last_login * 1000, { addSuffix: true })
        ) : (
          <span className='italic'>Never</span>
        )}
      </TableCell>
      <TableCell className='text-right'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='icon'>
              <MoreHorizontal className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <EditUserDialog user={user} onSuccess={onUpdate} />
            <SessionsDialog user={user} />
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleToggleMfaRequired}>
              <ShieldCheck className='mr-2 h-4 w-4' />
              {user.mfa_required ? 'Clear MFA Requirement' : 'Require MFA'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleStatus}>
              {isSuspended ? (
                <>
                  <UserCheck className='mr-2 h-4 w-4' />
                  Activate User
                </>
              ) : (
                <>
                  <Ban className='mr-2 h-4 w-4' />
                  Suspend User
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className='text-destructive'
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className='mr-2 h-4 w-4' />
              Delete User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete user?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the user "{user.username}". This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleteUser.isPending}
              >
                {deleteUser.isPending && (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                )}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}

type SortColumn = 'username' | 'role' | 'status' | 'last_login'
type SortOrder = 'asc' | 'desc'

function SortableHeader({
  column,
  label,
  currentSort,
  currentOrder,
  onSort,
}: {
  column: SortColumn
  label: string
  currentSort: SortColumn
  currentOrder: SortOrder
  onSort: (column: SortColumn) => void
}) {
  const isActive = currentSort === column
  return (
    <TableHead
      className='hover:bg-muted/50 cursor-pointer select-none'
      onClick={() => onSort(column)}
    >
      <div className='flex items-center gap-1'>
        {label}
        {isActive &&
          (currentOrder === 'asc' ? (
            <ChevronUp className='h-4 w-4' />
          ) : (
            <ChevronDown className='h-4 w-4' />
          ))}
      </div>
    </TableHead>
  )
}

export function SystemUsersContent() {
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(25)
  const [offset, setOffset] = useState(0)
  const [sort, setSort] = useState<SortColumn>('username')
  const [order, setOrder] = useState<SortOrder>('asc')
  const { refetch } = useSystemUsersData(limit, offset, search) // Need refetch for CreateUserDialog, but wait, data is fetched with debounced search

  const debouncedSearch = useDebounce(search, 300)

  // Reset offset when search changes
  useEffect(() => {
    setOffset(0)
  }, [debouncedSearch])

  const { data, isLoading, error } = useSystemUsersData(
    limit,
    offset,
    debouncedSearch
  )

  const handleSort = (column: SortColumn) => {
    if (sort === column) {
      setOrder(order === 'asc' ? 'desc' : 'asc')
    } else {
      setSort(column)
      setOrder('asc')
    }
  }

  // Client-side sorting (server-side would be better for large datasets)
  const sortedUsers = data?.users
    ? [...data.users].sort((a, b) => {
        let comparison = 0
        switch (sort) {
          case 'username':
            comparison = a.username.localeCompare(b.username)
            break
          case 'role':
            comparison = a.role.localeCompare(b.role)
            break
          case 'status':
            comparison = a.status.localeCompare(b.status)
            break
          case 'last_login':
            comparison = (a.last_login || 0) - (b.last_login || 0)
            break
        }
        return order === 'asc' ? comparison : -comparison
      })
    : []

  if (error) {
    return (
      <div className='p-6'>
        <p className='text-muted-foreground'>Failed to load users</p>
      </div>
    )
  }

  return (
    <>
      <div className='mb-6 flex w-full items-center justify-between'>
        <h2 className='text-lg font-semibold'>
          Users
          {data?.count !== undefined && (
            <span className='text-muted-foreground ml-2 font-normal'>
              ({data.count})
            </span>
          )}
        </h2>
        <div className='flex items-center gap-4'>
          <div className='relative'>
            <Search className='text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4' />
            <Input
              placeholder='Search users...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='w-64 pl-8'
            />
          </div>
          <CreateUserDialog onSuccess={() => refetch()} />
        </div>
      </div>

      {isLoading ? (
        <div className='space-y-2'>
          <Skeleton className='h-12 w-full' />
          <Skeleton className='h-12 w-full' />
          <Skeleton className='h-12 w-full' />
        </div>
      ) : sortedUsers.length > 0 ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader
                  column='username'
                  label='User'
                  currentSort={sort}
                  currentOrder={order}
                  onSort={handleSort}
                />
                <SortableHeader
                  column='role'
                  label='Role'
                  currentSort={sort}
                  currentOrder={order}
                  onSort={handleSort}
                />
                <SortableHeader
                  column='status'
                  label='Status'
                  currentSort={sort}
                  currentOrder={order}
                  onSort={handleSort}
                />
                <SortableHeader
                  column='last_login'
                  label='Last Login'
                  currentSort={sort}
                  currentOrder={order}
                  onSort={handleSort}
                />
                <TableHead className='w-[80px]' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onUpdate={() => refetch()}
                />
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {!debouncedSearch && data && data.count > limit && (
            <div className='flex items-center justify-between py-4'>
              <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                <span>
                  Showing {offset + 1}-{Math.min(offset + limit, data.count)}{' '}
                  of {data.count} users
                </span>
                <Select
                  value={String(limit)}
                  onValueChange={(v) => {
                    setLimit(Number(v))
                    setOffset(0)
                  }}
                >
                  <SelectTrigger className='h-8 w-20'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='10'>10</SelectItem>
                    <SelectItem value='25'>25</SelectItem>
                    <SelectItem value='50'>50</SelectItem>
                    <SelectItem value='100'>100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                >
                  <ChevronLeft className='mr-1 h-4 w-4' />
                  Previous
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= data.count}
                >
                  Next
                  <ChevronRight className='ml-1 h-4 w-4' />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className='text-muted-foreground py-8 text-center text-sm'>
          {debouncedSearch ? 'No users match your search' : 'No users found'}
        </p>
      )}
    </>
  )
}

export function SystemUsers() {
  return (
    <>
      <Header>
        <h1 className='text-lg font-semibold'>Users</h1>
      </Header>
      <Main>
        <SystemUsersContent />
      </Main>
    </>
  )
}
