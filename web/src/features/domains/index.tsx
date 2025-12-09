import { useState } from 'react'
import type { Domain, Route as RouteType, Delegation } from '@/types/domains'
import {
  Check,
  ChevronRight,
  Globe,
  Loader2,
  Lock,
  Plus,
  Route,
  Shield,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useDomainsData,
  useDomainDetails,
  useUpdateDomain,
  useDeleteDomain,
  useCreateRoute,
  useDeleteRoute,
  useCreateDelegation,
  useDeleteDelegation,
  useUserSearch,
} from '@/hooks/use-domains'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
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

function AddRouteDialog({
  domain,
  onSuccess,
}: {
  domain: string
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [path, setPath] = useState('')
  const [entity, setEntity] = useState('')
  const [priority, setPriority] = useState('0')
  const createRoute = useCreateRoute()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createRoute.mutate(
      { domain, path, entity, priority: parseInt(priority, 10) },
      {
        onSuccess: () => {
          toast.success('Route created')
          setOpen(false)
          setPath('')
          setEntity('')
          setPriority('0')
          onSuccess()
        },
        onError: (error: Error) => {
          toast.error(error.message || 'Failed to create route')
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size='sm'>
          <Plus className='mr-2 h-4 w-4' />
          Add Route
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Route</DialogTitle>
            <DialogDescription>Add a new route to {domain}</DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='path'>Path</Label>
              <Input
                id='path'
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder='/ or /blog'
              />
              <p className='text-muted-foreground text-xs'>
                Leave empty for root path
              </p>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='entity'>Entity</Label>
              <Input
                id='entity'
                value={entity}
                onChange={(e) => setEntity(e.target.value)}
                placeholder='app:myapp or redirect:https://...'
                required
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='priority'>Priority</Label>
              <Input
                id='priority'
                type='number'
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                placeholder='0'
              />
              <p className='text-muted-foreground text-xs'>
                Higher priority routes are matched first
              </p>
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
            <Button type='submit' disabled={createRoute.isPending}>
              {createRoute.isPending && (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              )}
              Add Route
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AddDelegationDialog({
  domain,
  onSuccess,
}: {
  domain: string
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [path, setPath] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<{
    id: number
    username: string
  } | null>(null)
  const [showResults, setShowResults] = useState(false)
  const createDelegation = useCreateDelegation()
  const { data: searchResults, isLoading: isSearching } =
    useUserSearch(searchQuery)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    createDelegation.mutate(
      { domain, path, owner: selectedUser.id },
      {
        onSuccess: () => {
          toast.success('Delegation created')
          setOpen(false)
          setPath('')
          setSearchQuery('')
          setSelectedUser(null)
          onSuccess()
        },
        onError: (error: Error) => {
          toast.error(error.message || 'Failed to create delegation')
        },
      }
    )
  }

  const handleSelectUser = (user: { id: number; username: string }) => {
    setSelectedUser(user)
    setSearchQuery(user.username)
    setShowResults(false)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setSelectedUser(null)
    setShowResults(true)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size='sm' variant='outline'>
          <Plus className='mr-2 h-4 w-4' />
          Add Delegation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Delegation</DialogTitle>
            <DialogDescription>
              Grant a user permission to manage routes on {domain}
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='path'>Path</Label>
              <Input
                id='path'
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder='/ or /blog'
              />
              <p className='text-muted-foreground text-xs'>
                Empty path grants full domain access
              </p>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='user'>User</Label>
              <div className='relative'>
                <Input
                  id='user'
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => setShowResults(true)}
                  onBlur={() => setTimeout(() => setShowResults(false), 200)}
                  placeholder='Search for a user...'
                  autoComplete='off'
                />
                {showResults && searchQuery.length >= 2 && (
                  <div className='bg-popover absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border shadow-lg'>
                    {isSearching ? (
                      <div className='text-muted-foreground flex items-center gap-2 p-2 text-sm'>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        Searching...
                      </div>
                    ) : searchResults && searchResults.length > 0 ? (
                      searchResults.map((user) => (
                        <button
                          key={user.id}
                          type='button'
                          className='hover:bg-accent hover:text-accent-foreground flex w-full items-center justify-between px-3 py-2 text-left text-sm'
                          onClick={() => handleSelectUser(user)}
                        >
                          <span>{user.username}</span>
                          <span className='text-muted-foreground text-xs'>
                            {user.role}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className='text-muted-foreground p-2 text-sm'>
                        No users found
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedUser && (
                <p className='text-muted-foreground text-xs'>
                  Selected: {selectedUser.username} (ID: {selectedUser.id})
                </p>
              )}
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
            <Button
              type='submit'
              disabled={createDelegation.isPending || !selectedUser}
            >
              {createDelegation.isPending && (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              )}
              Add Delegation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RouteRow({
  route,
  onDelete,
  isDeleting,
}: {
  route: RouteType
  onDelete: () => void
  isDeleting: boolean
}) {
  return (
    <TableRow>
      <TableCell className='font-mono text-sm'>{route.path || '/'}</TableCell>
      <TableCell className='max-w-[200px] truncate font-mono text-sm'>
        {route.entity}
      </TableCell>
      <TableCell>{route.priority}</TableCell>
      <TableCell>
        {route.enabled ? (
          <Badge variant='default'>Enabled</Badge>
        ) : (
          <Badge variant='secondary'>Disabled</Badge>
        )}
      </TableCell>
      <TableCell className='text-right'>
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
              <AlertDialogTitle>Delete route?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the route for path "{route.path || '/'}"
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}

function DelegationRow({
  delegation,
  onDelete,
  isDeleting,
}: {
  delegation: Delegation
  onDelete: () => void
  isDeleting: boolean
}) {
  return (
    <TableRow>
      <TableCell className='font-mono text-sm'>
        {delegation.path || '/'}
      </TableCell>
      <TableCell>{delegation.username}</TableCell>
      <TableCell className='text-right'>
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
              <AlertDialogTitle>Delete delegation?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the delegation for {delegation.username} on
                path "{delegation.path || '/'}"
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}

function DomainDetails({
  domain,
  isAdmin,
}: {
  domain: Domain
  isAdmin: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const { data, isLoading, refetch } = useDomainDetails(
    expanded ? domain.domain : ''
  )
  const updateDomain = useUpdateDomain()
  const deleteRoute = useDeleteRoute()
  const deleteDelegation = useDeleteDelegation()
  const [deletingRoute, setDeletingRoute] = useState<string | null>(null)
  const [deletingDelegation, setDeletingDelegation] = useState<string | null>(
    null
  )

  const handleToggleVerified = (checked: boolean) => {
    updateDomain.mutate(
      { domain: domain.domain, verified: checked },
      {
        onSuccess: () => toast.success('Domain updated'),
        onError: () => toast.error('Failed to update domain'),
      }
    )
  }

  const handleToggleTls = (checked: boolean) => {
    updateDomain.mutate(
      { domain: domain.domain, tls: checked },
      {
        onSuccess: () => toast.success('Domain updated'),
        onError: () => toast.error('Failed to update domain'),
      }
    )
  }

  const handleDeleteRoute = (path: string) => {
    setDeletingRoute(path)
    deleteRoute.mutate(
      { domain: domain.domain, path },
      {
        onSuccess: () => {
          toast.success('Route deleted')
          setDeletingRoute(null)
        },
        onError: () => {
          toast.error('Failed to delete route')
          setDeletingRoute(null)
        },
      }
    )
  }

  const handleDeleteDelegation = (d: Delegation) => {
    const key = `${d.domain}:${d.path}:${d.owner}`
    setDeletingDelegation(key)
    deleteDelegation.mutate(
      { domain: d.domain, path: d.path, owner: d.owner },
      {
        onSuccess: () => {
          toast.success('Delegation deleted')
          setDeletingDelegation(null)
        },
        onError: () => {
          toast.error('Failed to delete delegation')
          setDeletingDelegation(null)
        },
      }
    )
  }

  return (
    <div className='border-b last:border-b-0'>
      <div
        className='flex cursor-pointer items-center justify-between py-4'
        onClick={() => setExpanded(!expanded)}
      >
        <div className='flex items-center gap-3'>
          <Globe className='text-muted-foreground h-5 w-5' />
          <div>
            <span className='text-base font-semibold'>{domain.domain}</span>
            {isAdmin && (
              <div className='mt-1 flex items-center gap-2'>
                {domain.verified ? (
                  <Badge variant='default' className='text-xs'>
                    <Check className='mr-1 h-3 w-3' />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant='secondary' className='text-xs'>
                    <X className='mr-1 h-3 w-3' />
                    Unverified
                  </Badge>
                )}
                {domain.tls ? (
                  <Badge variant='outline' className='text-xs'>
                    <Lock className='mr-1 h-3 w-3' />
                    TLS
                  </Badge>
                ) : null}
              </div>
            )}
          </div>
        </div>
        <ChevronRight
          className={`text-muted-foreground h-5 w-5 transition-transform ${
            expanded ? 'rotate-90' : ''
          }`}
        />
      </div>
      {expanded && (
        <div className='space-y-6 pb-6'>
          {/* Admin-only: Settings */}
          {isAdmin && (
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <Label>Verified</Label>
                  <p className='text-muted-foreground text-xs'>
                    Domain ownership has been verified
                  </p>
                </div>
                <Switch
                  checked={domain.verified === 1}
                  onCheckedChange={handleToggleVerified}
                  disabled={updateDomain.isPending}
                />
              </div>
              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <Label>TLS Enabled</Label>
                  <p className='text-muted-foreground text-xs'>
                    Automatic HTTPS certificates
                  </p>
                </div>
                <Switch
                  checked={domain.tls === 1}
                  onCheckedChange={handleToggleTls}
                  disabled={updateDomain.isPending}
                />
              </div>
              {domain.token && (
                <div className='space-y-1'>
                  <Label>Verification Token</Label>
                  <p className='text-muted-foreground font-mono text-xs break-all'>
                    mochi-verify={domain.token}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Routes */}
          <div>
            <div className='mb-3 flex items-center justify-between'>
              <div className='flex items-center gap-2 text-sm font-medium'>
                <Route className='h-4 w-4' />
                Routes
              </div>
              <AddRouteDialog
                domain={domain.domain}
                onSuccess={() => refetch()}
              />
            </div>
            {isLoading ? (
              <Skeleton className='h-20 w-full' />
            ) : data?.routes && data.routes.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Path</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className='w-[50px]' />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.routes.map((route) => (
                    <RouteRow
                      key={`${route.domain}:${route.path}`}
                      route={route}
                      onDelete={() => handleDeleteRoute(route.path)}
                      isDeleting={deletingRoute === route.path}
                    />
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className='text-muted-foreground py-4 text-center text-sm'>
                No routes configured
              </p>
            )}
          </div>

          {/* Admin-only: Delegations */}
          {isAdmin && (
            <div>
              <div className='mb-3 flex items-center justify-between'>
                <div className='flex items-center gap-2 text-sm font-medium'>
                  <Users className='h-4 w-4' />
                  Delegations
                </div>
                <AddDelegationDialog
                  domain={domain.domain}
                  onSuccess={() => refetch()}
                />
              </div>
              {isLoading ? (
                <Skeleton className='h-20 w-full' />
              ) : data?.delegations && data.delegations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Path</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead className='w-[50px]' />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.delegations.map((d) => (
                      <DelegationRow
                        key={`${d.domain}:${d.path}:${d.owner}`}
                        delegation={d}
                        onDelete={() => handleDeleteDelegation(d)}
                        isDeleting={
                          deletingDelegation ===
                          `${d.domain}:${d.path}:${d.owner}`
                        }
                      />
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className='text-muted-foreground py-4 text-center text-sm'>
                  No delegations configured
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function DomainsContent() {
  const { data, isLoading, error, refetch } = useDomainsData()
  const deleteDomain = useDeleteDomain()
  const [deletingDomain, setDeletingDomain] = useState<string | null>(null)

  const handleDelete = (domain: string) => {
    setDeletingDomain(domain)
    deleteDomain.mutate(domain, {
      onSuccess: () => {
        toast.success('Domain deleted')
        setDeletingDomain(null)
        refetch()
      },
      onError: (error: Error) => {
        toast.error(error.message || 'Failed to delete domain')
        setDeletingDomain(null)
      },
    })
  }

  const isAdmin = data?.admin ?? false

  if (error) {
    return (
      <div className='p-6'>
        <p className='text-muted-foreground'>Failed to load domains</p>
      </div>
    )
  }

  return (
    <div className='divide-y'>
      {isLoading ? (
        <div className='space-y-4'>
          <Skeleton className='h-20 w-full' />
          <Skeleton className='h-20 w-full' />
        </div>
      ) : data?.domains && data.domains.length > 0 ? (
        <>
          {data.domains.map((domain) => (
            <div key={domain.domain} className='relative'>
              <DomainDetails domain={domain} isAdmin={isAdmin} />
              {isAdmin && (
                <div className='absolute top-4 right-8'>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-8 w-8'
                        disabled={deletingDomain === domain.domain}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {deletingDomain === domain.domain ? (
                          <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                          <Trash2 className='h-4 w-4' />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete domain?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete "{domain.domain}" and
                          all its routes. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(domain.domain)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          ))}
        </>
      ) : (
        <div className='text-muted-foreground py-8 text-center'>
          <Shield className='mx-auto mb-4 h-12 w-12 opacity-50' />
          {isAdmin ? (
            <p>No domains configured</p>
          ) : (
            <>
              <p>You don't have access to any domains.</p>
              <p className='mt-1 text-sm'>
                Contact an administrator to get a delegation.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function Domains() {
  const { data } = useDomainsData()

  return (
    <>
      <Header>
        <h1 className='text-lg font-semibold'>
          Domains
          {data?.count !== undefined && (
            <span className='text-muted-foreground ml-2 font-normal'>
              ({data.count})
            </span>
          )}
        </h1>
      </Header>

      <Main>
        <DomainsContent />
      </Main>
    </>
  )
}
