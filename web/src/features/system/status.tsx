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
  toast,
  getErrorMessage,
  usePageTitle,
  formatSystemTimestamp,
} from '@mochi/web'
import { useSystemSettingsData } from '@/hooks/use-system-settings'
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
              <dt className='text-muted-foreground w-28 shrink-0'><Trans>Version</Trans></dt>
              <dd className='font-medium'>{serverVersion}</dd>
            </div>
            <div className='flex flex-col gap-1 sm:flex-row sm:gap-4'>
              <dt className='text-muted-foreground w-28 shrink-0'><Trans>Started</Trans></dt>
              <dd className='font-mono text-xs'>
                {formatSystemTimestamp(parseInt(serverStarted, 10), serverStarted)}
              </dd>
            </div>
            {peerId && (
              <div className='flex flex-col gap-1 sm:flex-row sm:gap-4'>
                <dt className='text-muted-foreground w-28 shrink-0'><Trans>Peer ID</Trans></dt>
                <dd className='min-w-0 flex-1'>
                  <DataChip value={peerId} truncate='none' />
                </dd>
              </div>
            )}
            {showUpdate && (
              <div className='flex flex-col gap-2 sm:flex-row sm:gap-4'>
                <dt className='text-muted-foreground w-28 shrink-0'><Trans>Update</Trans></dt>
                <dd className='flex flex-col gap-2'>
                  <UpdateAction info={update} />
                </dd>
              </div>
            )}
          </dl>
        )}
      </Main>
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
