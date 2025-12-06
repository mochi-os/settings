import { useState } from 'react'
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
import {
  useSystemDomainsData,
  useSystemDomainDetails,
  useUpdateDomain,
  useDeleteDomain,
  useCreateDelegation,
  useDeleteDelegation,
} from '@/hooks/use-system-domains'
import type { SystemDomain, SystemDelegation } from '@/types/system-domains'

function AddDelegationDialog({
  domain,
  onSuccess,
}: {
  domain: string
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [path, setPath] = useState('')
  const [owner, setOwner] = useState('')
  const createDelegation = useCreateDelegation()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createDelegation.mutate(
      { domain, path, owner: parseInt(owner, 10) },
      {
        onSuccess: () => {
          toast.success('Delegation created')
          setOpen(false)
          setPath('')
          setOwner('')
          onSuccess()
        },
        onError: (error: Error) => {
          toast.error(error.message || 'Failed to create delegation')
        },
      }
    )
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
              <p className='text-xs text-muted-foreground'>
                Empty path grants full domain access
              </p>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='owner'>User ID</Label>
              <Input
                id='owner'
                type='number'
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder='1'
                required
              />
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
            <Button type='submit' disabled={createDelegation.isPending}>
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

function DelegationRow({
  delegation,
  onDelete,
  isDeleting,
}: {
  delegation: SystemDelegation
  onDelete: () => void
  isDeleting: boolean
}) {
  return (
    <TableRow>
      <TableCell className='font-mono text-sm'>
        {delegation.path || '/'}
      </TableCell>
      <TableCell>{delegation.owner}</TableCell>
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
                This will remove the delegation for user {delegation.owner} on
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

function DomainDetails({ domain }: { domain: SystemDomain }) {
  const [expanded, setExpanded] = useState(false)
  const { data, isLoading, refetch } = useSystemDomainDetails(
    expanded ? domain.domain : ''
  )
  const updateDomain = useUpdateDomain()
  const deleteDelegation = useDeleteDelegation()
  const [deletingDelegation, setDeletingDelegation] = useState<string | null>(
    null
  )

  const handleToggleVerified = (checked: boolean) => {
    updateDomain.mutate(
      { domain: domain.domain, verified: checked ? 'true' : 'false' },
      {
        onSuccess: () => toast.success('Domain updated'),
        onError: () => toast.error('Failed to update domain'),
      }
    )
  }

  const handleToggleTls = (checked: boolean) => {
    updateDomain.mutate(
      { domain: domain.domain, tls: checked ? 'true' : 'false' },
      {
        onSuccess: () => toast.success('Domain updated'),
        onError: () => toast.error('Failed to update domain'),
      }
    )
  }

  const handleDeleteDelegation = (d: SystemDelegation) => {
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
    <Card>
      <CardHeader
        className='cursor-pointer'
        onClick={() => setExpanded(!expanded)}
      >
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <Globe className='h-5 w-5 text-muted-foreground' />
            <div>
              <CardTitle className='text-base'>{domain.domain}</CardTitle>
              <div className='flex items-center gap-2 mt-1'>
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
            </div>
          </div>
          <ChevronRight
            className={`h-5 w-5 text-muted-foreground transition-transform ${
              expanded ? 'rotate-90' : ''
            }`}
          />
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className='space-y-6'>
          {/* Settings */}
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div className='space-y-0.5'>
                <Label>Verified</Label>
                <p className='text-xs text-muted-foreground'>
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
                <p className='text-xs text-muted-foreground'>
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
                <p className='font-mono text-xs text-muted-foreground break-all'>
                  mochi-verify={domain.token}
                </p>
              </div>
            )}
          </div>

          {/* Routes */}
          <div>
            <div className='flex items-center gap-2 mb-3 text-sm font-medium'>
              <Route className='h-4 w-4' />
              Routes
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.routes.map((route) => (
                    <TableRow key={`${route.domain}:${route.path}`}>
                      <TableCell className='font-mono text-sm'>
                        {route.path || '/'}
                      </TableCell>
                      <TableCell className='font-mono text-sm truncate max-w-[200px]'>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className='text-sm text-muted-foreground text-center py-4'>
                No routes configured
              </p>
            )}
          </div>

          {/* Delegations */}
          <div>
            <div className='flex items-center justify-between mb-3'>
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
                    <TableHead>User ID</TableHead>
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
              <p className='text-sm text-muted-foreground text-center py-4'>
                No delegations configured
              </p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export function SystemDomains() {
  const { data, isLoading, error, refetch } = useSystemDomainsData()
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

  if (error) {
    return (
      <>
        <Header>
          <h1 className='text-lg font-semibold'>Domains</h1>
        </Header>
        <Main>
          <Card>
            <CardHeader>
              <CardTitle>Domain Administration</CardTitle>
              <CardDescription>Failed to load domains</CardDescription>
            </CardHeader>
          </Card>
        </Main>
      </>
    )
  }

  return (
    <>
      <Header>
        <h1 className='text-lg font-semibold'>Domains</h1>
      </Header>

      <Main>
        <Card className='mb-6'>
          <CardHeader>
            <CardTitle>Domain Administration</CardTitle>
            <CardDescription>
              Manage all domains, routes, and delegations across the system.
              {data?.count !== undefined && (
                <span className='ml-1'>({data.count} total)</span>
              )}
            </CardDescription>
          </CardHeader>
        </Card>

        {isLoading ? (
          <div className='space-y-4'>
            <Skeleton className='h-20 w-full' />
            <Skeleton className='h-20 w-full' />
          </div>
        ) : data?.domains && data.domains.length > 0 ? (
          <div className='space-y-4'>
            {data.domains.map((domain) => (
              <div key={domain.domain} className='relative'>
                <DomainDetails domain={domain} />
                <div className='absolute top-4 right-12'>
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
                          This will permanently delete "{domain.domain}" and all
                          its routes. This action cannot be undone.
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
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className='py-8'>
              <div className='text-center text-muted-foreground'>
                <Shield className='mx-auto h-12 w-12 mb-4 opacity-50' />
                <p>No domains configured</p>
              </div>
            </CardContent>
          </Card>
        )}
      </Main>
    </>
  )
}
