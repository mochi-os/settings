import { useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { Check, Copy, Loader2, ServerOff, X } from 'lucide-react'
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
  Badge,
  Button,
  EmptyState,
  GeneralError,
  ListSkeleton,
  Main,
  PageHeader,
  StepUpDialog,
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
  type BootstrapEntry,
  type PendingJoin,
  type ServingEntry,
} from '@/hooks/use-system-replication'
import { stepUpClient } from '@/lib/step-up-client'
import { offlineActive, offlineDuration } from '@/lib/offline'

// pairMemberSyncStatus returns "synced" only when both directions are
// caught up: every inbound bootstrap row for this peer is 'done' AND
// every outbound `serving` row has been acked (deleted). Source side
// no longer flips to "synced" the instant the join is approved; both
// peers settle together.
function pairMemberSyncStatus(
  peer: string,
  bootstrap: BootstrapEntry[],
  serving: ServingEntry[],
): 'synced' | 'syncing' {
  const outbound = serving.filter((s) => s.peer === peer)
  if (outbound.length > 0) return 'syncing'
  const inbound = bootstrap.filter((b) => b.peer === peer)
  if (inbound.length === 0) return 'synced'
  return inbound.every((r) => r.state === 'done') ? 'synced' : 'syncing'
}

function PendingJoinRow({ join }: { join: PendingJoin }) {
  const { t } = useLingui()
  const approve = useApproveJoin()
  const deny = useDenyJoin()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const busy = approve.isPending || deny.isPending

  const onVerified = (token: string) =>
    approve.mutate(
      { peer: join.peer, token },
      {
        onSuccess: () => {
          setConfirmOpen(false)
          toast.success(t`Join request approved`)
        },
        onError: (e) => toast.error(getErrorMessage(e, t`Approval failed`)),
      },
    )

  return (
    <TableRow>
      <TableCell>
        {join.label ? (
          <span className='font-medium'>{join.label}</span>
        ) : (
          <span className='font-mono text-xs break-all'>{join.peer}</span>
        )}
      </TableCell>
      <TableCell className='text-end'>
        <div className='inline-flex gap-2'>
          <Button variant='outline' size='sm' disabled={busy} onClick={() => setConfirmOpen(true)}>
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
        <StepUpDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={t`Approve request`}
          description={t`Approving replicates private keys to that server. Verify it's you to continue.`}
          client={stepUpClient}
          onVerified={onVerified}
        />
      </TableCell>
    </TableRow>
  )
}

function PairMemberRow({
  peer,
  status,
  irreparable,
  offline,
}: {
  peer: string
  status: 'synced' | 'syncing'
  irreparable: boolean
  offline: number
}) {
  const { t } = useLingui()
  const remove = useRemovePair()

  return (
    <TableRow>
      <TableCell>
        <span className='font-mono text-xs break-all'>{peer}</span>
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {irreparable ? (
          <Badge variant='destructive'><Trans>Irreparable</Trans></Badge>
        ) : offlineActive(offline) ? (
          <Badge variant='outline' className='border-amber-500 text-amber-600 dark:text-amber-500'>
            {t`Offline ${offlineDuration(offline)}`}
          </Badge>
        ) : status === 'synced' ? (
          <Trans>Synced</Trans>
        ) : (
          <Trans>Syncing</Trans>
        )}
      </TableCell>
      <TableCell className='text-end'>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant='ghost' size='sm' disabled={remove.isPending}>
              {remove.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <ServerOff className='h-4 w-4' />}
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
  const addresses = data?.addresses ?? []
  const pair = data?.pair ?? []
  const irreparable = data?.irreparable ?? []
  const offline = new Map((data?.offline ?? []).map((o) => [o.peer, o.since]))
  const joins = data?.joins ?? []
  const bootstrap = data?.bootstrap ?? []
  const serving = data?.serving ?? []

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
              <h2 className='text-[1.125rem] leading-tight font-semibold md:text-lg'><Trans>This server</Trans></h2>
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
              {addresses.length > 0 && (
                <div className='space-y-1'>
                  <h3 className='text-muted-foreground text-sm font-medium'><Trans>Addresses</Trans></h3>
                  {addresses.map((address) => (
                    <div key={address} className='flex items-center gap-2'>
                      <code className='bg-muted rounded px-2 py-1 font-mono text-xs break-all'>{address}</code>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={async () => {
                          const ok = await shellClipboardWrite(address)
                          if (ok) toast.success(t`Address copied`)
                          else toast.error(t`Failed to copy`)
                        }}
                      >
                        <Copy className='h-3 w-3' />
                        <span className='sr-only'><Trans>Copy address</Trans></span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {joins.length > 0 && (
              <section className='space-y-2'>
                <h2 className='text-[1.125rem] leading-tight font-semibold md:text-lg'><Trans>Pending join requests</Trans></h2>
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

            <section className='space-y-2'>
              <h2 className='text-[1.125rem] leading-tight font-semibold md:text-lg'><Trans>Pair members</Trans></h2>
              {pair.length === 0 ? (
                <EmptyState
                  icon={Copy}
                  title={t`This server is not paired.`}
                  description={t`Use "mochictl replica join ${peer}" on a newly installed server to pair with this server.`}
                  className='p-4'
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><Trans>Peer</Trans></TableHead>
                      <TableHead><Trans>Status</Trans></TableHead>
                      <TableHead className='w-12'></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pair.map((p) => (
                      <PairMemberRow
                        key={p}
                        peer={p}
                        status={pairMemberSyncStatus(p, bootstrap, serving)}
                        irreparable={irreparable.includes(p)}
                        offline={offline.get(p) ?? 0}
                      />
                    ))}
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
