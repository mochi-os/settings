// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
//
// The reports that reach the server from other networks (the federation
// plan, phase 40): those waiting, which an administrator dismisses or
// resolves by blocking or suspending whoever they are about, and those
// resolved.
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Route } from '@/routes/_authenticated/system/reports'
import type { Report, ReportOutcome } from '@/types/moderation'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  Badge,
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
  Tabs,
  TabsList,
  TabsTrigger,
  formatSystemTimestamp,
  getErrorMessage,
  toast,
  usePageTitle,
} from '@mochi/web'
import { Ban, Flag, MoreHorizontal, X } from 'lucide-react'
import { networkLabel } from '@/lib/networks'
import { useStepUp } from '@/lib/use-step-up'
import {
  useSystemReportResolve,
  useSystemReports,
} from '@/hooks/use-system-moderation'

type ReportState = 'open' | 'resolved'

// What an administrator is about to do to a report, confirmed first: block the
// person it is about or the server of either party, or suspend the user it is
// about. A reporter on another server is blocked by their server, since on
// the fediverse a server reports as a representative of its own.
type Pending =
  | { report: Report; kind: 'person' | 'server'; target: string; name: string }
  | { report: Report; kind: 'suspend'; username: string }

function useCategoryLabel() {
  const { t } = useLingui()
  return (category: string): string => {
    switch (category) {
      case 'spam':
        return t({ message: 'Spam', context: 'report category' })
      case 'abuse':
        return t({ message: 'Abuse', context: 'report category' })
      case 'legal':
        return t({ message: 'Legal', context: 'report category' })
      case 'violation':
        return t({ message: 'Rule violation', context: 'report category' })
      case 'other':
        return t({ message: 'Other', context: 'report category' })
    }
    return ''
  }
}

function useOutcomeLabel() {
  const { t } = useLingui()
  return (outcome: ReportOutcome | ''): string => {
    switch (outcome) {
      case 'dismissed':
        return t({ message: 'Dismissed', context: 'report outcome' })
      case 'blocked':
        return t({ message: 'Blocked', context: 'report outcome' })
      case 'suspended':
        return t({ message: 'Suspended', context: 'report outcome' })
    }
    return ''
  }
}

// What a report says: its category, the reporter's words, the reported text
// where the server holds it, and links to what was complained of.
function ReportBody({ report }: { report: Report }) {
  const category = useCategoryLabel()(report.category)
  const links = report.objects.filter((object) => object.startsWith('https://'))
  return (
    <div className='space-y-1'>
      {category && <Badge variant='outline'>{category}</Badge>}
      {report.comment && (
        <div className='whitespace-pre-wrap'>{report.comment}</div>
      )}
      {report.content && (
        <blockquote className='text-muted-foreground border-s-2 ps-2 whitespace-pre-wrap'>
          {report.content}
        </blockquote>
      )}
      {links.map((link) => (
        <div key={link} className='truncate text-sm'>
          <a
            href={link}
            target='_blank'
            rel='noopener noreferrer'
            className='text-primary hover:underline'
          >
            {link}
          </a>
        </div>
      ))}
    </div>
  )
}

export function SystemReports() {
  const { t } = useLingui()
  usePageTitle(t`Reports`)
  const navigate = useNavigate()
  const search = Route.useSearch()
  const state: ReportState = search.state ?? 'open'
  const { data, isLoading, error, refetch } = useSystemReports(state)
  const resolve = useSystemReportResolve()
  const stepUp = useStepUp()
  const outcomeLabel = useOutcomeLabel()
  const [pending, setPending] = useState<Pending | null>(null)

  const setState = (next: ReportState) =>
    void navigate({
      to: '/system/reports',
      search: { state: next },
      replace: true,
    })

  const run = async (
    data: {
      id: string
      outcome: ReportOutcome
      target?: string
      token?: string
    },
    done: string
  ) => {
    try {
      await resolve.mutateAsync(data)
      toast.success(done)
    } catch (err) {
      toast.error(getErrorMessage(err, t`Could not resolve the report`))
    }
  }

  const confirm = (action: Pending) => {
    setPending(null)
    if (action.kind === 'suspend') {
      stepUp.request(
        (token) =>
          void run(
            { id: action.report.id, outcome: 'suspended', token },
            t`User suspended`
          )
      )
      return
    }
    void run(
      { id: action.report.id, outcome: 'blocked', target: action.target },
      t`Blocked`
    )
  }

  const reports = data?.reports ?? []

  return (
    <>
      <PageHeader
        title={t`Reports`}
        icon={<Flag className='size-4 md:size-5' />}
      />
      <Main>
        <Tabs
          value={state}
          onValueChange={(v) => setState(v as ReportState)}
          className='mb-4'
        >
          <TabsList>
            <TabsTrigger value='open'>
              <Trans context='reports'>Open</Trans>
            </TabsTrigger>
            <TabsTrigger value='resolved'>
              <Trans context='reports'>Resolved</Trans>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {error ? (
          <GeneralError error={error} minimal mode='inline' reset={refetch} />
        ) : isLoading || !data ? (
          <ListSkeleton />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Trans>Received</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Network</Trans>
                </TableHead>
                <TableHead>
                  <Trans context='report'>From</Trans>
                </TableHead>
                <TableHead>
                  <Trans context='report'>About</Trans>
                </TableHead>
                <TableHead>
                  <Trans context='report'>Report</Trans>
                </TableHead>
                {state === 'resolved' ? (
                  <TableHead>
                    <Trans>Outcome</Trans>
                  </TableHead>
                ) : (
                  <TableHead className='w-16'></TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className='text-muted-foreground text-center'
                  >
                    {state === 'open' ? (
                      <Trans>No reports are waiting.</Trans>
                    ) : (
                      <Trans>No reports have been resolved.</Trans>
                    )}
                  </TableCell>
                </TableRow>
              )}
              {reports.map((report) => {
                const person = report.person
                const reporter = report.reporter
                const hosts = [person?.host, reporter.host].filter(
                  (host, i, all): host is string =>
                    Boolean(host) && all.indexOf(host) === i
                )
                return (
                  <TableRow key={report.id}>
                    <TableCell className='text-muted-foreground tabular-nums'>
                      {formatSystemTimestamp(
                        report.created,
                        String(report.created)
                      )}
                    </TableCell>
                    <TableCell>{networkLabel(report.network)}</TableCell>
                    <TableCell>{reporter.name}</TableCell>
                    <TableCell>
                      {person ? (
                        <>
                          <div>{person.name}</div>
                          {report.account && (
                            <div className='text-muted-foreground text-sm'>
                              {report.account.username}
                              {report.account.status === 'suspended' && (
                                <>
                                  {' · '}
                                  <Trans>Suspended</Trans>
                                </>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        report.room && (
                          <>
                            <div>{report.room.name}</div>
                            <div className='text-muted-foreground text-sm'>
                              <Trans context='chat'>Room</Trans>
                            </div>
                          </>
                        )
                      )}
                    </TableCell>
                    <TableCell className='max-w-md'>
                      <ReportBody report={report} />
                    </TableCell>
                    {state === 'resolved' ? (
                      <TableCell>
                        <div>{outcomeLabel(report.outcome)}</div>
                        <div className='text-muted-foreground text-sm tabular-nums'>
                          {formatSystemTimestamp(
                            report.resolved,
                            String(report.resolved)
                          )}
                        </div>
                      </TableCell>
                    ) : (
                      <TableCell className='text-end'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='ghost'
                              size='sm'
                              icon={<MoreHorizontal className='h-4 w-4' />}
                              aria-label={t`Report actions`}
                            />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            <DropdownMenuItem
                              onClick={() =>
                                void run(
                                  { id: report.id, outcome: 'dismissed' },
                                  t`Report dismissed`
                                )
                              }
                            >
                              <X className='me-2 h-4 w-4' />
                              <Trans>Dismiss</Trans>
                            </DropdownMenuItem>
                            {person?.blockable && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setPending({
                                    report,
                                    kind: 'person',
                                    target: person.id,
                                    name: person.name,
                                  })
                                }
                              >
                                <Ban className='me-2 h-4 w-4' />
                                <Trans>Block {person.name}</Trans>
                              </DropdownMenuItem>
                            )}
                            {hosts.map((host) => (
                              <DropdownMenuItem
                                key={`server:${host}`}
                                onClick={() =>
                                  setPending({
                                    report,
                                    kind: 'server',
                                    target: host,
                                    name: host,
                                  })
                                }
                              >
                                <Ban className='me-2 h-4 w-4' />
                                <Trans>Block server {host}</Trans>
                              </DropdownMenuItem>
                            ))}
                            {report.account &&
                              report.account.status !== 'suspended' && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setPending({
                                      report,
                                      kind: 'suspend',
                                      username: report.account!.username,
                                    })
                                  }
                                >
                                  <Ban className='me-2 h-4 w-4' />
                                  <Trans>Suspend user</Trans>
                                </DropdownMenuItem>
                              )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Main>
      {pending && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setPending(null)
          }}
          title={
            pending.kind === 'suspend'
              ? t`Suspend user?`
              : t`Block ${pending.name}?`
          }
          desc={
            pending.kind === 'suspend'
              ? t`"${pending.username}" will be signed out and unable to sign in again until the suspension is removed.`
              : pending.kind === 'server'
                ? t`Nothing from ${pending.name} reaches anyone on this server, and no one here sends to it.`
                : t`Nothing they send reaches anyone on this server, and they are no longer anyone's follower here.`
          }
          confirmText={pending.kind === 'suspend' ? t`Suspend` : t`Block`}
          icon={<Ban className='size-4' />}
          destructive
          handleConfirm={() => confirm(pending)}
        />
      )}
      {stepUp.dialog}
    </>
  )
}
