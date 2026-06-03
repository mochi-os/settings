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
  DataChip,
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
  toast,
  useFormat,
  usePageTitle,
} from '@mochi/web'
import {
  useApproveLink,
  useDenyLink,
  useRemoveHost,
  useReplication,
  type ReplicationHost,
  type ReplicationLink,
} from '@/hooks/use-replication'
import { stepUpClient } from '@/lib/step-up-client'

function PendingRow({ link }: { link: ReplicationLink }) {
  const { t } = useLingui()
  const approve = useApproveLink()
  const deny = useDenyLink()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const busy = approve.isPending || deny.isPending

  const onVerified = (token: string) =>
    approve.mutate(
      { peer: link.peer, token },
      {
        onSuccess: () => {
          setConfirmOpen(false)
          toast.success(t`Request approved`)
        },
        onError: (e) => toast.error(getErrorMessage(e, t`Approval failed`)),
      },
    )

  const onDeny = () =>
    deny.mutate(link.peer, {
      onSuccess: () => toast.success(t`Request denied`),
      onError: (e) => toast.error(getErrorMessage(e, t`Could not deny request`)),
    })

  return (
    <TableRow>
      <TableCell>
        {link.label ? (
          <span className='font-medium'>{link.label}</span>
        ) : (
          <span className='font-mono text-xs break-all'>{link.peer}</span>
        )}
      </TableCell>
      <TableCell className='text-end'>
        <div className='inline-flex gap-2'>
          <Button variant='outline' size='sm' disabled={busy} onClick={() => setConfirmOpen(true)}>
            {approve.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <Check className='h-4 w-4' />}
            <Trans>Approve</Trans>
          </Button>
          <Button variant='outline' size='sm' disabled={busy} onClick={onDeny}>
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

function HostRow({ host }: { host: ReplicationHost }) {
  const { t } = useLingui()
  const { formatTimestamp } = useFormat()
  const remove = useRemoveHost()

  return (
    <TableRow>
      <TableCell>
        <span className='font-mono text-xs break-all'>{host.peer}</span>
        {host.irreparable && (
          <Badge variant='destructive' className='ml-2 align-middle'><Trans>Irreparable</Trans></Badge>
        )}
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {formatTimestamp(host.added, t`Unknown`)}
      </TableCell>
      <TableCell className='text-end'>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant='ghost' size='sm' disabled={remove.isPending}>
              {remove.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <ServerOff className='h-4 w-4' />}
              <span className='sr-only'><Trans>Remove host</Trans></span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle><Trans>Remove host?</Trans></AlertDialogTitle>
              <AlertDialogDescription>
                <Trans>
                  This server will stop replicating your account to that host. The host's local copy stays
                  in place until that operator removes it.
                </Trans>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel><Trans>Cancel</Trans></AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  remove.mutate(host.peer, {
                    onSuccess: () => toast.success(t`Host removed`),
                    onError: (e) => toast.error(getErrorMessage(e, t`Could not remove host`)),
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

export function UserReplication() {
  const { t } = useLingui()
  usePageTitle(t`Replication`)
  const { data, isLoading, error, refetch } = useReplication()

  const links = data?.links ?? []
  const hosts = data?.hosts ?? []
  const username = data?.user?.username ?? ''
  const peerId = data?.server?.id ?? ''

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
            {(username || peerId) && (
              <section className='space-y-2'>
                <h2 className='text-[1.125rem] leading-tight font-semibold md:text-lg'><Trans>This account</Trans></h2>
                <p className='text-muted-foreground text-sm'>
                  <Trans>Quote both values on the destination server's sign-up form to replicate this account there.</Trans>
                </p>
                <dl className='grid gap-3 text-sm'>
                  {username && (
                    <div className='flex flex-col gap-1 sm:flex-row sm:gap-4'>
                      <dt className='text-muted-foreground w-40 shrink-0'><Trans>Username</Trans></dt>
                      <dd className='min-w-0 flex-1'>
                        <DataChip value={username} truncate='none' />
                      </dd>
                    </div>
                  )}
                  {peerId && (
                    <div className='flex flex-col gap-1 sm:flex-row sm:gap-4'>
                      <dt className='text-muted-foreground w-40 shrink-0'><Trans>Server peer ID</Trans></dt>
                      <dd className='min-w-0 flex-1'>
                        <DataChip value={peerId} truncate='none' />
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            )}

            {links.length > 0 && (
              <section className='space-y-2'>
                <h2 className='text-[1.125rem] leading-tight font-semibold md:text-lg'><Trans>Pending requests</Trans></h2>
                <p className='text-muted-foreground text-sm'>
                  <Trans>Another server is asking to host a copy of your account. Approve to send a copy.</Trans>
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><Trans>From</Trans></TableHead>
                      <TableHead className='text-end'></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {links.map((link) => <PendingRow key={link.peer} link={link} />)}
                  </TableBody>
                </Table>
              </section>
            )}

            <section className='space-y-2'>
              <h2 className='text-[1.125rem] leading-tight font-semibold md:text-lg'><Trans>My hosts</Trans></h2>
              {hosts.length === 0 ? (
                <EmptyState
                  icon={Copy}
                  title={t`This account is on this server only`}
                  description={t`To replicate it to another server, sign up for an account there and use the "Replicate an existing account" option.`}
                  className='p-4'
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><Trans>Peer</Trans></TableHead>
                      <TableHead><Trans>Added</Trans></TableHead>
                      <TableHead className='w-12'></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hosts.map((host) => <HostRow key={host.peer} host={host} />)}
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
