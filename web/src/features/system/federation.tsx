// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
//
// What the server knows of the servers it talks to (the federation plan,
// phase 40): on the fediverse each host it delivers to, with its failures and
// whether the limit on requests to it is holding deliveries back; on Matrix
// each server's backoff and waiting transactions; on XMPP each link to another
// server, and the clients signed in.
import type { ReactNode } from 'react'
import { plural } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  Badge,
  GeneralError,
  ListSkeleton,
  Main,
  PageHeader,
  Section,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  formatSystemTimestamp,
  naturalCompare,
  useFormat,
  usePageTitle,
} from '@mochi/web'
import { Network } from 'lucide-react'
import { networkLabel } from '@/lib/networks'
import { useSystemHosts } from '@/hooks/use-system-moderation'

// A time, or a dash for never.
function When({ unix }: { unix: number }) {
  return (
    <span className='text-muted-foreground tabular-nums'>
      {unix > 0 ? formatSystemTimestamp(unix, String(unix)) : '-'}
    </span>
  )
}

function Empty({ columns }: { columns: number }) {
  return (
    <TableRow>
      <TableCell
        colSpan={columns}
        className='text-muted-foreground text-center'
      >
        <Trans>No servers yet.</Trans>
      </TableCell>
    </TableRow>
  )
}

function Heads({ children }: { children: ReactNode }) {
  return (
    <TableHeader>
      <TableRow>{children}</TableRow>
    </TableHeader>
  )
}

export function SystemFederation() {
  const { t } = useLingui()
  usePageTitle(t`Federation`)
  const { formatNumber } = useFormat()
  const { data, isLoading, error, refetch } = useSystemHosts()

  const fediverse = [...(data?.fediverse ?? [])].sort((a, b) =>
    naturalCompare(a.host, b.host)
  )
  const matrix = [...(data?.matrix ?? [])].sort((a, b) =>
    naturalCompare(a.server, b.server)
  )
  const links = [...(data?.xmpp.links ?? [])].sort(
    (a, b) =>
      naturalCompare(a.server, b.server) || naturalCompare(a.domain, b.domain)
  )
  // The clients signed in to the server's XMPP accounts, and to how many
  // accounts.
  const sessions = data?.xmpp.sessions
  const clients = formatNumber(sessions?.clients ?? 0)
  const accounts = formatNumber(sessions?.accounts ?? 0)
  const signedIn = t`${plural(sessions?.clients ?? 0, {
    one: `${clients} client signed in`,
    other: `${clients} clients signed in`,
  })} · ${plural(sessions?.accounts ?? 0, {
    one: `${accounts} account`,
    other: `${accounts} accounts`,
  })}`

  return (
    <>
      <PageHeader
        title={t`Federation`}
        icon={<Network className='size-4 md:size-5' />}
      />
      <Main className='space-y-4'>
        {error ? (
          <GeneralError error={error} minimal mode='inline' reset={refetch} />
        ) : isLoading || !data ? (
          <ListSkeleton />
        ) : (
          <>
            <Section title={networkLabel('fediverse')}>
              <Table>
                <Heads>
                  <TableHead>
                    <Trans>Server</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Failures</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Last success</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Last failure</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Next attempt</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Waiting</Trans>
                  </TableHead>
                </Heads>
                <TableBody>
                  {fediverse.length === 0 && <Empty columns={6} />}
                  {fediverse.map((host) => (
                    <TableRow key={host.host}>
                      <TableCell className='font-medium'>
                        <div className='flex flex-wrap items-center gap-2'>
                          {host.host}
                          {host.limited && (
                            <Badge variant='outline'>
                              <Trans>At its request limit</Trans>
                            </Badge>
                          )}
                        </div>
                        {host.error && (
                          <div className='text-muted-foreground text-sm break-all'>
                            {host.error}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className='tabular-nums'>
                        {formatNumber(host.failures)}
                      </TableCell>
                      <TableCell>
                        <When unix={host.success} />
                      </TableCell>
                      <TableCell>
                        <When unix={host.failure} />
                      </TableCell>
                      <TableCell>
                        <When unix={host.next} />
                      </TableCell>
                      <TableCell className='tabular-nums'>
                        {formatNumber(host.waiting)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
            <Section title={networkLabel('matrix')}>
              <Table>
                <Heads>
                  <TableHead>
                    <Trans>Server</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Failures</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Next attempt</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Waiting</Trans>
                  </TableHead>
                </Heads>
                <TableBody>
                  {matrix.length === 0 && <Empty columns={4} />}
                  {matrix.map((server) => (
                    <TableRow key={server.server}>
                      <TableCell className='font-medium'>
                        {server.server}
                      </TableCell>
                      <TableCell className='tabular-nums'>
                        {formatNumber(server.failures)}
                      </TableCell>
                      <TableCell>
                        <When unix={server.next} />
                      </TableCell>
                      <TableCell className='tabular-nums'>
                        {formatNumber(server.waiting)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
            <Section title={networkLabel('xmpp')} description={signedIn}>
              <Table>
                <Heads>
                  <TableHead>
                    <Trans>Server</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans context='xmpp link'>From</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Status</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Failures</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Next attempt</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Waiting</Trans>
                  </TableHead>
                </Heads>
                <TableBody>
                  {links.length === 0 && <Empty columns={6} />}
                  {links.map((link) => (
                    <TableRow key={`${link.domain} ${link.server}`}>
                      <TableCell className='font-medium'>
                        {link.server}
                      </TableCell>
                      <TableCell className='text-muted-foreground'>
                        {link.domain}
                      </TableCell>
                      <TableCell>
                        {link.up ? (
                          <Trans context='xmpp link'>Connected</Trans>
                        ) : (
                          <Trans context='xmpp link'>Not connected</Trans>
                        )}
                      </TableCell>
                      <TableCell className='tabular-nums'>
                        {formatNumber(link.failures)}
                      </TableCell>
                      <TableCell>
                        <When unix={link.next} />
                      </TableCell>
                      <TableCell className='tabular-nums'>
                        {formatNumber(link.waiting)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          </>
        )}
      </Main>
    </>
  )
}
