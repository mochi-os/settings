import { format } from 'date-fns'
import { Activity } from 'lucide-react'
import {
  Skeleton,
  PageHeader,
  Main,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  usePageTitle
} from '@mochi/common'
import { useSystemSettingsData } from '@/hooks/use-system-settings'

function formatTimestamp(value: string): string {
  const timestamp = parseInt(value, 10)
  if (isNaN(timestamp)) return value
  return format(new Date(timestamp * 1000), 'yyyy-MM-dd HH:mm:ss')
}

export function SystemStatus() {
  usePageTitle('Status')
  const { data, isLoading, error } = useSystemSettingsData()

  if (error) {
    return (
      <>
        <PageHeader title="Status" icon={<Activity className='size-4 md:size-5' />} />
        <Main>
          <p className='text-muted-foreground'>Failed to load status</p>
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
              <div className='space-y-3'>
                <Skeleton className='h-4 w-48' />
                <Skeleton className='h-4 w-64' />
              </div>
            ) : (
              <dl className='grid gap-3 text-sm'>
                <div className='flex flex-col gap-1 sm:flex-row sm:gap-4'>
                  <dt className='text-muted-foreground w-28 shrink-0'>Version</dt>
                  <dd className='font-medium'>{serverVersion}</dd>
                </div>
                <div className='flex flex-col gap-1 sm:flex-row sm:gap-4'>
                  <dt className='text-muted-foreground w-28 shrink-0'>Started</dt>
                  <dd className='font-mono text-xs'>
                    {formatTimestamp(serverStarted)}
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
