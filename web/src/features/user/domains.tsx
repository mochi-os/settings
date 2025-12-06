import { useState } from 'react'
import { ChevronRight, Globe, Loader2, Plus, Route, Trash2 } from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useUserDomainsData,
  useDomainRoutes,
  useSetRoute,
  useDeleteRoute,
} from '@/hooks/use-domains'
import type { Domain, Route as RouteType } from '@/types/domains'

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
      <TableCell className='font-mono text-sm'>
        {route.path || '/'}
      </TableCell>
      <TableCell className='font-mono text-sm truncate max-w-[200px]'>
        {route.entity}
      </TableCell>
      <TableCell className='text-right'>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              disabled={isDeleting}
            >
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
                This will remove the route for path "{route.path || '/'}".
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
  const setRoute = useSetRoute()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setRoute.mutate(
      { domain, path, entity },
      {
        onSuccess: () => {
          toast.success('Route added')
          setOpen(false)
          setPath('')
          setEntity('')
          onSuccess()
        },
        onError: () => {
          toast.error('Failed to add route')
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
            <DialogDescription>
              Add a new route to {domain}
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='path'>Path</Label>
              <Input
                id='path'
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder='/blog'
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='entity'>Entity</Label>
              <Input
                id='entity'
                value={entity}
                onChange={(e) => setEntity(e.target.value)}
                placeholder='entity:id'
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
            <Button type='submit' disabled={setRoute.isPending}>
              {setRoute.isPending && (
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

function DomainRoutes({ domain }: { domain: Domain }) {
  const [expanded, setExpanded] = useState(false)
  const { data, isLoading, refetch } = useDomainRoutes(
    expanded ? domain.domain : ''
  )
  const deleteRoute = useDeleteRoute()
  const [deletingPath, setDeletingPath] = useState<string | null>(null)

  const handleDelete = (path: string) => {
    setDeletingPath(path)
    deleteRoute.mutate(
      { domain: domain.domain, path },
      {
        onSuccess: () => {
          toast.success('Route deleted')
          setDeletingPath(null)
        },
        onError: () => {
          toast.error('Failed to delete route')
          setDeletingPath(null)
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
              {domain.entity && (
                <CardDescription className='font-mono text-xs'>
                  {domain.entity}
                </CardDescription>
              )}
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
        <CardContent>
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
              <Route className='h-4 w-4' />
              Routes
            </div>
            <AddRouteDialog
              domain={domain.domain}
              onSuccess={() => refetch()}
            />
          </div>
          {isLoading ? (
            <div className='space-y-2'>
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
            </div>
          ) : data?.routes && data.routes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Path</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className='w-[50px]' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.routes.map((route) => (
                  <RouteRow
                    key={`${route.domain}:${route.path}`}
                    route={route}
                    onDelete={() => handleDelete(route.path)}
                    isDeleting={deletingPath === route.path}
                  />
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className='text-sm text-muted-foreground text-center py-4'>
              No routes configured
            </p>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export function UserDomains() {
  const { data, isLoading, error } = useUserDomainsData()

  if (error) {
    return (
      <>
        <Header>
          <h1 className='text-lg font-semibold'>My Domains</h1>
        </Header>
        <Main>
          <Card>
            <CardHeader>
              <CardTitle>Domain Management</CardTitle>
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
        <h1 className='text-lg font-semibold'>My Domains</h1>
      </Header>

      <Main>
        <Card className='mb-6'>
          <CardHeader>
            <CardTitle>Domain Management</CardTitle>
            <CardDescription>
              Manage your personal domains and their routes.
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
              <DomainRoutes key={domain.domain} domain={domain} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className='py-8'>
              <div className='text-center text-muted-foreground'>
                <Globe className='mx-auto h-12 w-12 mb-4 opacity-50' />
                <p>You don't have any domains yet.</p>
                <p className='text-sm mt-1'>
                  Contact an administrator to get access to a domain.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </Main>
    </>
  )
}
