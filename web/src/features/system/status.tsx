// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { ReactNode } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  Button,
  CopyButton,
  DataChip,
  FieldRow,
  GeneralError,
  ListSkeleton,
  PageHeader,
  Main,
  Section,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
  getErrorMessage,
  naturalCompare,
  useFormat,
  usePageTitle,
  formatSystemTimestamp,
} from '@mochi/web'
import { Activity, Download, Loader2 } from 'lucide-react'
import { peerDisplayName, hyphenateFingerprint } from '@/lib/peer'
import { useStepUp } from '@/lib/use-step-up'
import { useSystemPeers, type PeerEntry } from '@/hooks/use-system-peers'
import { useSystemSettingsData } from '@/hooks/use-system-settings'
import {
  useInstallSystemUpdate,
  useSystemUpdate,
  type SystemUpdateInfo,
} from '@/hooks/use-system-update'
import { PeerIdentity } from '@/components/peer-identity'

export function SystemStatus() {
  const { t } = useLingui()
  usePageTitle(t`Status`)
  const { data, isLoading, error, refetch } = useSystemSettingsData()
  const { data: update } = useSystemUpdate()

  const settings = data?.settings ?? []
  const serverVersion =
    settings.find((s) => s.name === 'server_version')?.value ?? ''
  const serverStarted =
    settings.find((s) => s.name === 'server_started')?.value ?? ''
  const peerId = data?.server?.id ?? ''
  const serverFingerprint = data?.server?.fingerprint ?? ''

  const showUpdate = update && (update.available || update.pending)

  return (
    <>
      <PageHeader
        title={t`Status`}
        icon={<Activity className='size-4 md:size-5' />}
      />

      <Main className='space-y-8'>
        <Section title={t`Server`}>
          {error ? (
            <GeneralError error={error} minimal mode='inline' reset={refetch} />
          ) : isLoading ? (
            <ListSkeleton variant='simple' height='h-9' count={4} />
          ) : (
            <div className='divide-y-0'>
              <FieldRow label={t`Version`}>
                <span className='text-sm'>{serverVersion}</span>
              </FieldRow>
              <FieldRow label={t`Started`}>
                <span className='text-sm tabular-nums'>
                  {formatSystemTimestamp(
                    parseInt(serverStarted, 10),
                    serverStarted
                  )}
                </span>
              </FieldRow>
              {serverFingerprint && (
                <FieldRow label={t`Fingerprint`}>
                  <DataChip
                    value={hyphenateFingerprint(serverFingerprint)}
                    truncate='middle'
                  />
                </FieldRow>
              )}
              {peerId && (
                <FieldRow label={t`Peer ID`}>
                  <DataChip value={peerId} truncate='none' />
                </FieldRow>
              )}
              {showUpdate && (
                <FieldRow label={t`Update`}>
                  <div className='flex flex-col gap-2 py-1'>
                    <UpdateAction info={update} />
                  </div>
                </FieldRow>
              )}
            </div>
          )}
        </Section>
        <NetworkStatus />
      </Main>
    </>
  )
}

function StatusValue({ children }: { children: ReactNode }) {
  return <span className='text-sm tabular-nums'>{children}</span>
}

function NetworkStatus() {
  const { t } = useLingui()
  const { formatNumber } = useFormat()
  const { data, isLoading, error, refetch } = useSystemPeers()

  // Returning null here made a failure indistinguishable from a server with
  // nothing to report: the whole network section, peer table included, simply
  // was not on the page, with no message and nothing to retry.
  if (error) {
    return (
      <Section title={t`Network`}>
        <GeneralError error={error} minimal mode='inline' reset={refetch} />
      </Section>
    )
  }
  if (isLoading || !data) {
    return (
      <Section title={t`Network`}>
        <ListSkeleton variant='simple' height='h-9' count={4} />
      </Section>
    )
  }

  const network = data.network
  const counts = data.counts
  // Total order: name, fingerprint, then peer id compared byte-exactly. The
  // list refetches every 5s, so a partial comparator makes same-name peers swap
  // places; naturalCompare is case-insensitive and would leave base58 ids tied.
  const peers = [...data.peers].sort(
    (a: PeerEntry, b: PeerEntry) =>
      naturalCompare(peerDisplayName(a), peerDisplayName(b)) ||
      naturalCompare(a.fingerprint ?? '', b.fingerprint ?? '') ||
      (a.peer < b.peer ? -1 : a.peer > b.peer ? 1 : 0)
  )
  const connected = peers.filter((p) => p.connected).length
  const queued = peers.reduce((sum, p) => sum + p.queued, 0)
  const reachability =
    {
      public: t`Public`,
      private: t`Private`,
      unknown: t`Unknown`,
    }[network.reachability] ?? t`Unknown`

  return (
    <>
      <Section title={t`Network`}>
        <div className='divide-y-0'>
          <FieldRow label={t`Users`}>
            <StatusValue>{formatNumber(counts.users)}</StatusValue>
          </FieldRow>
          <FieldRow label={t`Entities`}>
            <StatusValue>{formatNumber(counts.entities)}</StatusValue>
          </FieldRow>
          <FieldRow label={t`Reachability`}>
            <StatusValue>
              {reachability}
              {network.relay ? ` · ${t`Via relay`}` : ''}
            </StatusValue>
          </FieldRow>
          {network.last > 0 && (
            <FieldRow label={t`Last broadcast`}>
              <StatusValue>
                {formatSystemTimestamp(network.last, String(network.last))}
              </StatusValue>
            </FieldRow>
          )}
          {network.holepunch &&
            network.holepunch.success + network.holepunch.failure > 0 && (
              <FieldRow label={t`Hole punch`}>
                <StatusValue>
                  <Trans>
                    {formatNumber(network.holepunch.success)} succeeded ·{' '}
                    {formatNumber(network.holepunch.failure)} failed
                  </Trans>
                </StatusValue>
              </FieldRow>
            )}
          {network.relaying?.active && (
            <FieldRow label={t`Relay service`}>
              <StatusValue>
                <Trans>
                  {formatNumber(network.relaying.reservations.held)} /{' '}
                  {formatNumber(network.relaying.reservations.maximum)}{' '}
                  reservations · {formatNumber(network.relaying.circuits)}{' '}
                  circuits · {formatNumber(network.relaying.rejected)} refused
                </Trans>
              </StatusValue>
            </FieldRow>
          )}
          <FieldRow label={t`Messages awaiting routing`}>
            <StatusValue>{formatNumber(network.unresolved)}</StatusValue>
          </FieldRow>
          <FieldRow label={t`Queued messages`}>
            <StatusValue>{formatNumber(queued)}</StatusValue>
          </FieldRow>
          <FieldRow label={t`Queued broadcast messages`}>
            <StatusValue>{formatNumber(network.queued)}</StatusValue>
          </FieldRow>
        </div>
      </Section>
      {peers.length > 0 && (
        <Section
          title={t`Peers`}
          contentClassName='px-0 py-0'
          action={
            <span className='text-muted-foreground text-end text-sm'>
              <Trans>Known</Trans> {formatNumber(peers.length)} ·{' '}
              <Trans>Connected</Trans> {formatNumber(connected)} ·{' '}
              <Trans>Broadcast mesh</Trans> {formatNumber(network.mesh)}
            </span>
          }
        >
          <Table bordered={false} stickyFirstColumn>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Trans>Peer</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Status</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Address</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Last seen</Trans>
                </TableHead>
                <TableHead className='text-end'>
                  <Trans>Queued messages</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Oldest queued message</Trans>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {peers.map((p) => (
                <TableRow key={p.peer}>
                  {/* The table sits in a card, so the sticky cell takes the
                      card's fill rather than the page background the shared
                      table defaults to. */}
                  <TableCell className='bg-surface-1'>
                    <PeerIdentity
                      peer={p.peer}
                      name={p.name}
                      fingerprint={p.fingerprint}
                    />
                  </TableCell>
                  <TableCell className='text-muted-foreground'>
                    {p.connected ? (
                      <Trans>Connected</Trans>
                    ) : p.unreachable ? (
                      <Trans>Unreachable</Trans>
                    ) : (
                      <Trans>Disconnected</Trans>
                    )}
                  </TableCell>
                  <TableCell className='font-mono text-xs'>
                    {p.address}
                  </TableCell>
                  <TableCell className='text-muted-foreground tabular-nums'>
                    {p.seen > 0
                      ? formatSystemTimestamp(p.seen, String(p.seen))
                      : ''}
                  </TableCell>
                  <TableCell className='text-end tabular-nums'>
                    {formatNumber(p.queued)}
                  </TableCell>
                  <TableCell className='text-muted-foreground tabular-nums'>
                    {p.queued > 0
                      ? formatSystemTimestamp(p.oldest, String(p.oldest))
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}
    </>
  )
}

function UpdateAction({ info }: { info: SystemUpdateInfo }) {
  if (info.pending) {
    return (
      <div className='flex items-center gap-2 text-sm'>
        <Loader2 className='size-4 animate-spin' />
        <Trans>Installing {info.pending}…</Trans>
      </div>
    )
  }

  return (
    <>
      <p className='font-medium'>
        <Trans>Mochi {info.latest} is available</Trans>
      </p>
      <UpdateButton platform={info.platform} latest={info.latest} />
    </>
  )
}

function UpdateButton({
  platform,
  latest,
}: {
  platform: string
  latest: string
}) {
  switch (platform) {
    case 'linux-deb':
      return (
        <CommandHint command='sudo apt update && sudo apt install mochi-server' />
      )
    case 'linux-rpm':
      return <CommandHint command='sudo dnf upgrade mochi-server' />
    case 'docker':
      return (
        <CommandHint command='docker compose pull && docker compose up -d' />
      )
    case 'windows':
      return <InstallButton latest={latest} />
    case 'macos-arm64':
      return (
        <DownloadLink href='https://packages.mochi-os.org/macos/mochi-server-arm64.pkg'>
          <Trans>Download installer</Trans>
        </DownloadLink>
      )
    case 'macos-amd64':
      return (
        <DownloadLink href='https://packages.mochi-os.org/macos/mochi-server-amd64.pkg'>
          <Trans>Download installer</Trans>
        </DownloadLink>
      )
    default:
      return (
        <DownloadLink href='https://packages.mochi-os.org/'>
          <Trans>Download from packages.mochi-os.org</Trans>
        </DownloadLink>
      )
  }
}

function InstallButton({ latest }: { latest: string }) {
  const { t } = useLingui()
  const install = useInstallSystemUpdate()
  const stepUp = useStepUp()
  const onClick = () =>
    stepUp.request(async (token) => {
      try {
        await install.mutateAsync(token)
      } catch (e) {
        toast.error(getErrorMessage(e, t`Failed to install update`))
      }
    })
  return (
    <>
      {stepUp.dialog}
      <Button
        variant='default'
        size='sm'
        onClick={onClick}
        loading={install.isPending}
        icon={<Download />}
        title={t`Download Mochi ${latest} and restart the server`}
      >
        <Trans>Install update</Trans>
      </Button>
    </>
  )
}

function CommandHint({ command }: { command: string }) {
  return (
    <div className='flex items-center gap-2'>
      <code className='bg-muted flex-1 rounded px-2 py-1 text-xs break-all'>
        {command}
      </code>
      <CopyButton value={command} />
    </div>
  )
}

function DownloadLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Button asChild variant='outline' size='sm'>
      <a href={href} target='_blank' rel='noreferrer'>
        <Download />
        {children}
      </a>
    </Button>
  )
}
