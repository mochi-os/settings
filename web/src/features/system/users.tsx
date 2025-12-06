import { useState } from 'react'
import { Loader2, Pencil, Plus, Shield, Trash2, User as UserIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
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
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import {
  useSystemUsersData,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from '@/hooks/use-system-users'
import type { User } from '@/types/users'

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
            <DialogDescription>
              Add a new user to the system.
            </DialogDescription>
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
                  <SelectItem value='user'>User</SelectItem>
                  <SelectItem value='administrator'>Administrator</SelectItem>
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
        <Button variant='ghost' size='icon'>
          <Pencil className='h-4 w-4' />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details.
            </DialogDescription>
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
                  <SelectItem value='user'>User</SelectItem>
                  <SelectItem value='administrator'>Administrator</SelectItem>
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

function UserRow({
  user,
  onDelete,
  isDeleting,
  onUpdate,
}: {
  user: User
  onDelete: () => void
  isDeleting: boolean
  onUpdate: () => void
}) {
  const isAdmin = user.role === 'administrator'

  return (
    <TableRow>
      <TableCell>
        <div className='flex items-center gap-2'>
          {isAdmin ? (
            <Shield className='h-4 w-4 text-amber-500' />
          ) : (
            <UserIcon className='h-4 w-4 text-muted-foreground' />
          )}
          <span className='font-medium'>{user.username}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={isAdmin ? 'default' : 'secondary'}>
          {isAdmin ? 'Administrator' : 'User'}
        </Badge>
      </TableCell>
      <TableCell className='text-right'>
        <div className='flex items-center justify-end gap-1'>
          <EditUserDialog user={user} onSuccess={onUpdate} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant='ghost' size='icon' disabled={isDeleting}>
                {isDeleting ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Trash2 className='h-4 w-4' />
                )}
              </Button>
            </AlertDialogTrigger>
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
                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  )
}

export function SystemUsers() {
  const { data, isLoading, error, refetch } = useSystemUsersData()
  const deleteUser = useDeleteUser()
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const handleDelete = (id: number) => {
    setDeletingId(id)
    deleteUser.mutate(id, {
      onSuccess: () => {
        toast.success('User deleted')
        setDeletingId(null)
      },
      onError: (error: Error) => {
        toast.error(error.message || 'Failed to delete user')
        setDeletingId(null)
      },
    })
  }

  if (error) {
    return (
      <>
        <Header>
          <h1 className='text-lg font-semibold'>Users</h1>
        </Header>
        <Main>
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Failed to load users</CardDescription>
            </CardHeader>
          </Card>
        </Main>
      </>
    )
  }

  return (
    <>
      <Header>
        <h1 className='text-lg font-semibold'>Users</h1>
      </Header>

      <Main>
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  View and manage all users in the system.
                  {data?.count !== undefined && (
                    <span className='ml-1'>({data.count} total)</span>
                  )}
                </CardDescription>
              </div>
              <CreateUserDialog onSuccess={() => refetch()} />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='space-y-2'>
                <Skeleton className='h-12 w-full' />
                <Skeleton className='h-12 w-full' />
                <Skeleton className='h-12 w-full' />
              </div>
            ) : data?.users && data.users.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className='w-[100px]' />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.users.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      onDelete={() => handleDelete(user.id)}
                      isDeleting={deletingId === user.id}
                      onUpdate={() => refetch()}
                    />
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className='text-sm text-muted-foreground text-center py-8'>
                No users found
              </p>
            )}
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
