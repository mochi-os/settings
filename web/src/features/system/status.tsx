import type { ReactNode } from 'react'
import { Activity, Download, Loader2 } from 'lucide-react'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  Button,
  CopyButton,
  DataChip,
  GeneralError,
  ListSkeleton,
  PageHeader,
  Main,
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
import { useSystemSettingsData } from '@/hooks/use-system-settings'
import { useSystemPeers, type PeerEntry } from '@/hooks/use-system-peers'
import { PeerIdentity, peerDisplayName, hyphenateFingerprint } from '@/components/peer-identity'
import {
  useInstallSystemUpdate,
  useSystemUpdate,
  type SystemUpdateInfo,
} from '@/hooks/use-system-update'

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
      <PageHeader title={t`Status`} icon={<Activity className='size-4 md:size-5' />} />

      <Main>
        {error ? (
          <GeneralError error={error} minimal mode='inline' reset={refetch} />
        ) : isLoading ? (
          <ListSkeleton variant='simple' height='h-4' count={2} />
        ) : (
          <dl className='grid gap-3 text-sm'>
            <div className='flex flex-col gap-1 sm:flex-row sm:gap-4'>
              <dt className='text-muted-foreground w-32 shrink-0'><Trans>Version</Trans></dt>
              <dd className='font-medium'>{serverVersion}</dd>
            </div>
            <div className='flex flex-col gap-1 sm:flex-row sm:gap-4'>
              <dt className='text-muted-foreground w-32 shrink-0'><Trans>Started</Trans></dt>
              <dd className='font-mono text-xs'>
                {formatSystemTimestamp(parseInt(serverStarted, 10), serverStarted)}
              </dd>
            </div>
            {serverFingerprint && (
              <div className='flex flex-col gap-1 sm:flex-row sm:gap-4'>
                <dt className='text-muted-foreground w-32 shrink-0'><Trans>Fingerprint</Trans></dt>
                <dd className='min-w-0 flex-1'>
                  <DataChip value={hyphenateFingerprint(serverFingerprint)} truncate='middle' />
                </dd>
              </div>
            )}
            {peerId && (
              <div className='flex flex-col gap-1 sm:flex-row sm:gap-4'>
                <dt className='text-muted-foreground w-32 shrink-0'><Trans>Peer ID</Trans></dt>
                <dd className='min-w-0 flex-1'>
                  <DataChip value={peerId} truncate='none' />
                </dd>
              </div>
            )}
            {showUpdate && (
              <div className='flex flex-col gap-2 sm:flex-row sm:gap-4'>
                <dt className='text-muted-foreground w-32 shrink-0'><Trans>Update</Trans></dt>
                <dd className='flex flex-col gap-2'>
                  <UpdateAction info={update} />
                </dd>
              </div>
            )}
          </dl>
        )}
        <NetworkStatus />
      </Main>
    </>
  )
}

function StatusRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className='flex flex-col gap-1 sm:flex-row sm:gap-4'>
      <dt className='text-muted-foreground w-32 shrink-0'>{label}</dt>
      <dd className='font-medium'>{children}</dd>
    </div>
  )
}

function NetworkStatus() {
  const { t } = useLingui()
  const { formatNumber } = useFormat()
  const { data } = useSystemPeers()

  if (!data) return null

  const network = data.network
  const counts = data.counts
  const peers = [...data.peers].sort((a: PeerEntry, b: PeerEntry) =>
    naturalCompare(peerDisplayName(a), peerDisplayName(b)),
  )
  const connected = peers.filter((p) => p.connected).length
  const queued = peers.reduce((sum, p) => sum + p.queued, 0)
  const reachability = {
    public: t`Public`,
    private: t`Private`,
    unknown: t`Unknown`,
  }[network.reachability] ?? t`Unknown`

  return (
    <>
      <dl className='mt-3 grid gap-3 text-sm'>
        <StatusRow label={<Trans>Users</Trans>}>{formatNumber(counts.users)}</StatusRow>
        <StatusRow label={<Trans>Entities</Trans>}>{formatNumber(counts.entities)}</StatusRow>
        <StatusRow label={<Trans>Reachability</Trans>}>
          {reachability}
          {network.relay ? ` · ${t`Via relay`}` : ''}
        </StatusRow>
        {network.last > 0 && (
          <StatusRow label={<Trans>Last broadcast</Trans>}>
            <span className='font-mono text-xs font-normal'>
              {formatSystemTimestamp(network.last, String(network.last))}
            </span>
          </StatusRow>
        )}
        {network.holepunch && network.holepunch.success + network.holepunch.failure > 0 && (
          <StatusRow label={<Trans>Hole punch</Trans>}>
            <Trans>
              {formatNumber(network.holepunch.success)} succeeded · {formatNumber(network.holepunch.failure)} failed
            </Trans>
          </StatusRow>
        )}
      </dl>
      {peers.length > 0 && (
        <section className='mt-8 space-y-2'>
          <h2 className='text-[1.125rem] leading-tight font-semibold md:text-lg'><Trans>Peers</Trans></h2>
          <p className='text-muted-foreground text-sm'>
            <Trans>Known</Trans> {formatNumber(peers.length)} · <Trans>Connected</Trans>{' '}
            {formatNumber(connected)} · <Trans>Broadcast mesh</Trans> {formatNumber(network.mesh)} ·{' '}
            <Trans>Queued messages</Trans> {formatNumber(queued)} ·{' '}
            <Trans>Queued broadcasts</Trans> {formatNumber(network.queued)}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='h-auto w-[26%] py-2 align-top whitespace-normal'><Trans>Peer</Trans></TableHead>
                <TableHead className='h-auto w-[10%] py-2 align-top whitespace-normal'><Trans>Status</Trans></TableHead>
                <TableHead className='h-auto w-[26%] py-2 align-top whitespace-normal'><Trans>Address</Trans></TableHead>
                <TableHead className='h-auto w-[14%] py-2 align-top whitespace-normal'><Trans>Last seen</Trans></TableHead>
                <TableHead className='h-auto w-[10%] py-2 text-end align-top whitespace-normal'><Trans>Queued messages</Trans></TableHead>
                <TableHead className='h-auto w-[14%] ps-8 py-2 align-top whitespace-normal'><Trans>Oldest queued message</Trans></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {peers.map((p) => (
                <TableRow key={p.peer}>
                  <TableCell className='align-top whitespace-normal'>
                    <PeerIdentity peer={p.peer} name={p.name} verified={p.verified} fingerprint={p.fingerprint} />
                  </TableCell>
                  <TableCell className='text-muted-foreground align-top text-sm'>
                    {p.connected ? (
                      <Trans>Connected</Trans>
                    ) : p.unreachable ? (
                      <Trans>Unreachable</Trans>
                    ) : (
                      <Trans>Disconnected</Trans>
                    )}
                  </TableCell>
                  <TableCell className='align-top font-mono text-xs break-all whitespace-normal'>{p.address}</TableCell>
                  <TableCell className='align-top font-mono text-xs'>
                    {p.seen > 0 ? formatSystemTimestamp(p.seen, String(p.seen)) : ''}
                  </TableCell>
                  <TableCell className='align-top text-end text-sm'>
                    {formatNumber(p.queued)}
                  </TableCell>
                  <TableCell className='ps-8 align-top font-mono text-xs'>
                    {p.queued > 0 ? formatSystemTimestamp(p.oldest, String(p.oldest)) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
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

function UpdateButton({ platform, latest }: { platform: string; latest: string }) {
  switch (platform) {
    case 'linux-deb':
      return <CommandHint command='sudo apt update && sudo apt install mochi-server' />
    case 'linux-rpm':
      return <CommandHint command='sudo dnf upgrade mochi-server' />
    case 'docker':
      return <CommandHint command='docker compose pull && docker compose up -d' />
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
  const onClick = async () => {
    try {
      await install.mutateAsync()
    } catch (e) {
      toast.error(getErrorMessage(e, t`Failed to install update`))
    }
  }
  return (
    <Button
      variant='default'
      size='sm'
      onClick={onClick}
      disabled={install.isPending}
      title={t`Download Mochi ${latest} and restart the server`}
    >
      {install.isPending ? <Loader2 className='animate-spin' /> : <Download />}
      <Trans>Install update</Trans>
    </Button>
  )
}

function CommandHint({ command }: { command: string }) {
  return (
    <div className='flex items-center gap-2'>
      <code className='bg-muted px-2 py-1 rounded text-xs flex-1 break-all'>{command}</code>
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
