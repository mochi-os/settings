import { Trans, useLingui } from '@lingui/react/macro'
import { Check, Copy, Loader2, Trash2, X } from 'lucide-react'
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
  EmptyState,
  GeneralError,
  ListSkeleton,
  Main,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  getErrorMessage,
  shellClipboardWrite,
  toast,
  usePageTitle,
} from '@mochi/web'
import {
  useApproveJoin,
  useDenyJoin,
  useRemovePair,
  useSystemReplication,
  type PendingJoin,
} from '@/hooks/use-system-replication'

function shortPeer(peer: string): string {
  if (peer.length <= 16) return peer
  return `${peer.slice(0, 8)}…${peer.slice(-6)}`
}

function PendingJoinRow({ join }: { join: PendingJoin }) {
  const { t } = useLingui()
  const approve = useApproveJoin()
  const deny = useDenyJoin()
  const busy = approve.isPending || deny.isPending

  return (
    <TableRow>
      <TableCell>
        <span className='font-medium'>{join.label || shortPeer(join.peer)}</span>
        {join.label && (
          <div className='text-muted-foreground font-mono text-xs'>
            {shortPeer(join.peer)}
          </div>
        )}
      </TableCell>
      <TableCell className='text-end'>
        <div className='inline-flex gap-2'>
          <Button
            variant='outline'
            size='sm'
            disabled={busy}
            onClick={() =>
              approve.mutate(join.peer, {
                onSuccess: () => toast.success(t`Join request approved`),
                onError: (e) => toast.error(getErrorMessage(e, t`Approval failed`)),
              })
            }
          >
            {approve.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <Check className='h-4 w-4' />}
            <Trans>Approve</Trans>
          </Button>
          <Button
            variant='outline'
            size='sm'
            disabled={busy}
            onClick={() =>
              deny.mutate(join.peer, {
                onSuccess: () => toast.success(t`Join request denied`),
                onError: (e) => toast.error(getErrorMessage(e, t`Could not deny request`)),
              })
            }
          >
            {deny.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <X className='h-4 w-4' />}
            <Trans>Deny</Trans>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function PairMemberRow({ peer }: { peer: string }) {
  const { t } = useLingui()
  const remove = useRemovePair()

  return (
    <TableRow>
      <TableCell>
        <span className='font-mono text-sm'>{shortPeer(peer)}</span>
      </TableCell>
      <TableCell className='text-end'>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant='ghost' size='sm' disabled={remove.isPending}>
              {remove.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <Trash2 className='h-4 w-4' />}
              <span className='sr-only'><Trans>Remove pair member</Trans></span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle><Trans>Remove pair member?</Trans></AlertDialogTitle>
              <AlertDialogDescription>
                <Trans>
                  This server will stop pairing with that peer. The removed server keeps its local copy of every
                  user; the operator there must wipe it manually.
                </Trans>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel><Trans>Cancel</Trans></AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  remove.mutate(peer, {
                    onSuccess: () => toast.success(t`Pair member removed`),
                    onError: (e) => toast.error(getErrorMessage(e, t`Could not remove pair member`)),
                  })
                }
              >
                <Trans>Remove</Trans>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}

export function SystemReplication() {
  const { t } = useLingui()
  usePageTitle(t`Replication`)
  const { data, isLoading, error, refetch } = useSystemReplication()

  const peer = data?.peer ?? ''
  const pair = data?.pair ?? []
  const joins = data?.joins ?? []
  const bootstrap = data?.bootstrap ?? []
  const bootstrapPending = data?.bootstrap_pending ?? 0

  return (
    <>
      <PageHeader title={t`Replication`} icon={<Copy className='size-4 md:size-5' />} />

      <Main>
        {error ? (
          <GeneralError error={error} minimal mode='inline' reset={refetch} />
        ) : isLoading ? (
          <ListSkeleton variant='simple' height='h-10' count={3} />
        ) : (
          <div className='space-y-8'>
            <section className='space-y-2'>
              <h2 className='text-base font-medium'><Trans>This server</Trans></h2>
              <p className='text-muted-foreground text-sm'>
                <Trans>
                  Share this peer id with another operator to start a server pair from there using{' '}
                  <span className='font-mono'>mochictl replica join</span>.
                </Trans>
              </p>
              <div className='flex items-center gap-2'>
                <code className='bg-muted rounded px-2 py-1 font-mono text-xs break-all'>{peer}</code>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={async () => {
                    const ok = await shellClipboardWrite(peer)
                    if (ok) toast.success(t`Peer id copied`)
                    else toast.error(t`Failed to copy`)
                  }}
                >
                  <Copy className='h-3 w-3' />
                  <span className='sr-only'><Trans>Copy peer id</Trans></span>
                </Button>
              </div>
            </section>

            {joins.length > 0 && (
              <section className='space-y-2'>
                <h2 className='text-base font-medium'><Trans>Pending join requests</Trans></h2>
                <p className='text-muted-foreground text-sm'>
                  <Trans>
                    Another server is asking to pair with this one. Approve to enrol it as a full replication peer.
                  </Trans>
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><Trans>From</Trans></TableHead>
                      <TableHead className='text-end'></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {joins.map((j) => <PendingJoinRow key={j.peer} join={j} />)}
                  </TableBody>
                </Table>
              </section>
            )}

            {bootstrap.length > 0 && (
              <section className='space-y-2'>
                <h2 className='text-base font-medium'><Trans>Bulk bootstrap</Trans></h2>
                <p className='text-muted-foreground text-sm'>
                  {bootstrapPending > 0 ? (
                    <Trans>Transferring data from pair members. Each scope completes independently.</Trans>
                  ) : (
                    <Trans>All scopes are caught up. Live replication is the only ongoing activity.</Trans>
                  )}
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><Trans>Peer</Trans></TableHead>
                      <TableHead><Trans>Scope</Trans></TableHead>
                      <TableHead><Trans>State</Trans></TableHead>
                      <TableHead><Trans>Remaining</Trans></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bootstrap.map((b) => (
                      <TableRow key={`${b.peer}-${b.scope}`}>
                        <TableCell className='font-mono text-xs'>{shortPeer(b.peer)}</TableCell>
                        <TableCell>{b.scope}</TableCell>
                        <TableCell className='text-muted-foreground text-sm'>{b.state}</TableCell>
                        <TableCell className='text-muted-foreground text-sm'>
                          {b.state === 'active' && b.position ? b.position : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </section>
            )}

            <section className='space-y-2'>
              <h2 className='text-base font-medium'><Trans>Pair members</Trans></h2>
              {pair.length === 0 ? (
                <EmptyState
                  icon={Copy}
                  title={t`This server is not paired`}
                  description={t`Pair with another freshly-installed server using "mochictl replica join <existing-peer-id>" on the new server.`}
                  className='p-4'
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><Trans>Peer</Trans></TableHead>
                      <TableHead className='w-12'></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pair.map((p) => <PairMemberRow key={p} peer={p} />)}
                  </TableBody>
                </Table>
              )}
            </section>
          </div>
        )}
      </Main>
    </>
  )
}
