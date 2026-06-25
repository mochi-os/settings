// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

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
  toastAction,
  useFormat,
  usePageTitle,
} from '@mochi/web'
import { isInShell } from '@mochi/web'
import {
  useApproveLink,
  useDenyLink,
  useLeaveServer,
  useRemoveHost,
  useReplication,
  type ReplicationHost,
  type ReplicationLink,
} from '@/hooks/use-replication'
import { offlineActive, offlineDuration } from '@/lib/offline'
import { stepUpClient } from '@/lib/step-up-client'
import { PeerIdentity, hyphenateFingerprint } from '@/components/peer-identity'

// Leaving deletes this server's copy and its sessions, so the shell loses auth.
// Bounce to login (the account is still on the user's other servers).
function goToLogin() {
  const url = '/'
  if (isInShell()) window.parent.postMessage({ type: 'navigate-top', url }, '*')
  else window.location.href = url
}

function PendingRow({ link }: { link: ReplicationLink }) {
  const { t } = useLingui()
  const approve = useApproveLink()
  const deny = useDenyLink()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const busy = approve.isPending || deny.isPending

  const onVerified = async (token: string) => {
    try {
      await toastAction(approve.mutateAsync({ peer: link.peer, token }), {
        loading: t`Approving...`,
        success: t`Request approved`,
        error: (e) => getErrorMessage(e, t`Approval failed`),
      })
      setConfirmOpen(false)
    } catch {
      // toastAction already showed error
    }
  }

  const onDeny = async () => {
    try {
      await toastAction(deny.mutateAsync(link.peer), {
        loading: t`Denying...`,
        success: t`Request denied`,
        error: (e) => getErrorMessage(e, t`Could not deny request`),
      })
    } catch {
      // toastAction already showed error
    }
  }

  return (
    <TableRow>
      <TableCell className='align-top'>
        <div className='min-w-0 space-y-0.5'>
          {link.label && <div className='font-medium'>{link.label}</div>}
          {link.name && <div className='text-sm font-medium'>{link.name}</div>}
          {link.fingerprint && (
            <div className='text-muted-foreground font-mono text-xs'>{hyphenateFingerprint(link.fingerprint)}</div>
          )}
          <div className='font-mono text-xs break-all'>{link.peer}</div>
        </div>
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

// A host in the set is informational. To remove a *reachable* replica, the
// user signs in on that server and uses "Remove my account from this server".
// Only an *unreachable* host gets an advanced "forget" here (you can't sign in
// to a down server), which removes it and tells it to purge when it reconnects.
function HostRow({ host }: { host: ReplicationHost }) {
  const { t } = useLingui()
  const { formatTimestamp } = useFormat()
  const remove = useRemoveHost()
  const [stepOpen, setStepOpen] = useState(false)
  const unreachable = host.irreparable || offlineActive(host.offline)

  return (
    <TableRow>
      <TableCell className='align-top'>
        <div className='flex items-start gap-2'>
          <PeerIdentity peer={host.peer} name={host.name} fingerprint={host.fingerprint} />
          {host.irreparable ? (
            <Badge variant='destructive'><Trans>Irreparable</Trans></Badge>
          ) : offlineActive(host.offline) ? (
            <Badge variant='outline' className='border-amber-500 text-amber-600 dark:text-amber-500'>
              {t`Offline ${offlineDuration(host.offline)}`}
            </Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell className='text-muted-foreground align-top text-sm'>
        {formatTimestamp(host.added, t`Unknown`)}
      </TableCell>
      <TableCell className='text-end'>
        {unreachable && (
          <>
            <Button
              variant='ghost'
              size='sm'
              disabled={remove.isPending}
              onClick={() => setStepOpen(true)}
            >
              {remove.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <ServerOff className='h-4 w-4' />}
              <span className='sr-only'><Trans>Forget this unreachable host</Trans></span>
            </Button>
            <StepUpDialog
              open={stepOpen}
              onOpenChange={setStepOpen}
              title={t`Forget this unreachable host?`}
              description={t`It will be removed from your replica set and told to delete its copy when it reconnects. To remove a reachable server, sign in there and use "Remove my account from this server". Verify it's you to continue.`}
              client={stepUpClient}
              onVerified={async (token) => {
                try {
                  await toastAction(
                    remove.mutateAsync({ peer: host.peer, token }),
                    {
                      loading: t`Removing host...`,
                      success: t`Host forgotten`,
                      error: (e) =>
                        getErrorMessage(e, t`Could not forget host`),
                    }
                  )
                  setStepOpen(false)
                } catch {
                  // toastAction already showed error
                }
              }}
            />
          </>
        )}
      </TableCell>
    </TableRow>
  )
}

// The primary "remove a replica" action, local to this server.
function LeaveThisServer() {
  const { t } = useLingui()
  const leave = useLeaveServer()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [stepOpen, setStepOpen] = useState(false)

  return (
    <>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogTrigger asChild>
          <Button variant='outline' size='sm'>
            <ServerOff className='me-2 h-4 w-4' />
            <Trans>Remove my account from this server</Trans>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle><Trans>Remove your account from this server?</Trans></AlertDialogTitle>
            <AlertDialogDescription>
              <Trans>
                Your account's data on this server will be permanently deleted and you'll be signed
                out here. Your account stays on your other servers, and you can re-add this one later.
              </Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel><Trans>Cancel</Trans></AlertDialogCancel>
            <AlertDialogAction
              variant='destructive'
              onClick={() => { setConfirmOpen(false); setStepOpen(true) }}
            >
              <Trans>Remove</Trans>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <StepUpDialog
        open={stepOpen}
        onOpenChange={setStepOpen}
        title={t`Confirm it's you`}
        description={t`This permanently deletes your account's data on this server. Verify it's you to continue.`}
        client={stepUpClient}
        onVerified={async (token) => {
          try {
            await toastAction(leave.mutateAsync({ token }), {
              loading: t`Removing account...`,
              success: false,
              error: (e) =>
                getErrorMessage(
                  e,
                  t`Could not remove your account from this server`
                ),
            })
            goToLogin()
          } catch {
            setStepOpen(false)
          }
        }}
      />
    </>
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
  const serverFingerprint = data?.server?.fingerprint ?? ''

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
                      <dd className='min-w-0 flex-1 space-y-1'>
                        <DataChip value={peerId} truncate='none' />
                        {serverFingerprint && (
                          <div className='text-muted-foreground font-mono text-xs'>{hyphenateFingerprint(serverFingerprint)}</div>
                        )}
                      </dd>
                    </div>
                  )}
                </dl>
                {hosts.length > 0 && (
                  <div className='pt-2'>
                    <LeaveThisServer />
                  </div>
                )}
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
              {hosts.length > 0 && (
                <p className='text-muted-foreground text-sm'>
                  <Trans>Other servers that also hold a copy of your account. To remove one, sign in on that server and use "Remove my account from this server".</Trans>
                </p>
              )}
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
