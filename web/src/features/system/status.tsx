import { Activity } from 'lucide-react'
import {
  GeneralError,
  ListSkeleton,
  PageHeader,
  Main,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  usePageTitle,
  formatTimestamp,
} from '@mochi/common'
import { useSystemSettingsData } from '@/hooks/use-system-settings'

export function SystemStatus() {
  usePageTitle('Status')
  const { data, isLoading, error } = useSystemSettingsData()

  if (error) {
    return (
      <>
        <PageHeader title="Status" icon={<Activity className='size-4 md:size-5' />} />
        <Main>
          <GeneralError error={error} minimal mode='inline' />
        </Main>
      </>
    )
  }

  const settings = data?.settings ?? []
  const serverVersion =
    settings.find((s) => s.name === 'server_version')?.value ?? ''
  const serverStarted =
    settings.find((s) => s.name === 'server_started')?.value ?? ''

  return (
    <>
      <PageHeader title="Status" icon={<Activity className='size-4 md:size-5' />} />

      <Main>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className='h-5 w-5' />
              Server
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ListSkeleton variant='simple' height='h-4' count={2} />
            ) : (
              <dl className='grid gap-3 text-sm'>
                <div className='flex flex-col gap-1 sm:flex-row sm:gap-4'>
                  <dt className='text-muted-foreground w-28 shrink-0'>Version</dt>
                  <dd className='font-medium'>{serverVersion}</dd>
                </div>
                <div className='flex flex-col gap-1 sm:flex-row sm:gap-4'>
                  <dt className='text-muted-foreground w-28 shrink-0'>Started</dt>
                  <dd className='font-mono text-xs'>
                    {formatTimestamp(parseInt(serverStarted, 10), serverStarted)}
                  </dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
