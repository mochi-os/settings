import { useState } from 'react'
import { Package, RefreshCw, Settings2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Button,
  Header,
  Main,
  Skeleton,
  usePageTitle,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertDescription,
  getErrorMessage,
} from '@mochi/common'
import {
  useAppsAvailable,
  useAppsList,
  useAppDetail,
  useAppsRouting,
  useSetAppVersion,
  useAppsCleanup,
  useSetAppRouting,
} from '@/hooks/use-system-apps'

function AppsNotAvailable({ version }: { version: string }) {
  return (
    <>
      <Header>
        <h1 className='text-lg font-semibold'>Apps</h1>
      </Header>
      <Main>
        <Alert>
          <AlertDescription>
            Multi-version app management requires Mochi 0.3 or later. Current
            version: {version}
          </AlertDescription>
        </Alert>
      </Main>
    </>
  )
}

function AppsList() {
  const { data, isLoading, error } = useAppsList()
  const [selectedApp, setSelectedApp] = useState<string | null>(null)

  if (error) {
    return <p className='text-muted-foreground'>Failed to load apps</p>
  }

  if (isLoading) {
    return (
      <div className='space-y-3'>
        <Skeleton className='h-20 w-full' />
        <Skeleton className='h-20 w-full' />
        <Skeleton className='h-20 w-full' />
      </div>
    )
  }

  const apps = data?.apps ?? []

  if (selectedApp) {
    return (
      <AppDetail appId={selectedApp} onBack={() => setSelectedApp(null)} />
    )
  }

  return (
    <div className='space-y-3'>
      {apps.map((app) => (
        <Card
          key={app.id}
          className='cursor-pointer hover:bg-accent/50 transition-colors'
          onClick={() => setSelectedApp(app.id)}
        >
          <CardHeader className='py-3'>
            <div className='flex items-center justify-between'>
              <CardTitle className='text-base'>{app.label || app.id}</CardTitle>
              <Badge variant='secondary'>{app.version}</Badge>
            </div>
            <CardDescription className='text-xs'>
              {app.id}
              {app.versions.length > 1 && (
                <span className='ml-2'>
                  ({app.versions.length} versions installed)
                </span>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      ))}
      {apps.length === 0 && (
        <p className='text-muted-foreground text-sm'>No apps installed</p>
      )}
    </div>
  )
}

function AppDetail({ appId, onBack }: { appId: string; onBack: () => void }) {
  const { data, isLoading, error } = useAppDetail(appId)
  const setVersion = useSetAppVersion()
  const [selectedVersion, setSelectedVersion] = useState<string>('')
  const [selectedTrack, setSelectedTrack] = useState<string>('')

  if (error) {
    return (
      <div>
        <Button variant='ghost' onClick={onBack} className='mb-4'>
          Back
        </Button>
        <p className='text-muted-foreground'>Failed to load app details</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div>
        <Button variant='ghost' onClick={onBack} className='mb-4'>
          Back
        </Button>
        <Skeleton className='h-32 w-full' />
      </div>
    )
  }

  const versions = data?.versions ?? []
  const tracks = data?.tracks ?? {}
  const defaultVersion = data?.default?.version ?? ''
  const defaultTrack = data?.default?.track ?? ''

  const handleSetVersion = () => {
    if (selectedVersion) {
      setVersion.mutate(
        { app: appId, version: selectedVersion, track: '' },
        {
          onSuccess: () => toast.success(`Default set to version ${selectedVersion}`),
          onError: (err) => toast.error(getErrorMessage(err, 'Failed to set version')),
        }
      )
    }
  }

  const handleSetTrack = () => {
    if (selectedTrack) {
      setVersion.mutate(
        { app: appId, version: '', track: selectedTrack },
        {
          onSuccess: () => toast.success(`Now following track: ${selectedTrack}`),
          onError: (err) => toast.error(getErrorMessage(err, 'Failed to set track')),
        }
      )
    }
  }

  const handleClearDefault = () => {
    setVersion.mutate(
      { app: appId, version: '', track: '' },
      {
        onSuccess: () => toast.success('Using highest version'),
        onError: (err) => toast.error(getErrorMessage(err, 'Failed to clear default')),
      }
    )
  }

  return (
    <div className='space-y-4'>
      <Button variant='ghost' onClick={onBack}>
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{appId}</CardTitle>
          <CardDescription>
            {defaultVersion && `Default version: ${defaultVersion}`}
            {defaultTrack && `Following track: ${defaultTrack}`}
            {!defaultVersion && !defaultTrack && 'Using highest version'}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <label className='text-sm font-medium'>Set specific version</label>
            <div className='flex gap-2'>
              <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                <SelectTrigger className='w-48'>
                  <SelectValue placeholder='Select version' />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleSetVersion}
                disabled={!selectedVersion || setVersion.isPending}
              >
                Set
              </Button>
            </div>
          </div>

          {Object.keys(tracks).length > 0 && (
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Follow track</label>
              <div className='flex gap-2'>
                <Select value={selectedTrack} onValueChange={setSelectedTrack}>
                  <SelectTrigger className='w-48'>
                    <SelectValue placeholder='Select track' />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(tracks).map(([track, version]) => (
                      <SelectItem key={track} value={track}>
                        {track} ({version})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleSetTrack}
                  disabled={!selectedTrack || setVersion.isPending}
                >
                  Set
                </Button>
              </div>
            </div>
          )}

          {(defaultVersion || defaultTrack) && (
            <Button
              variant='outline'
              onClick={handleClearDefault}
              disabled={setVersion.isPending}
            >
              Clear default (use highest)
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function RoutingTab() {
  const { data: routingData, isLoading, error } = useAppsRouting()
  const { data: appsData } = useAppsList()
  const setRouting = useSetAppRouting()
  const [addType, setAddType] = useState<'class' | 'service' | 'path' | null>(null)
  const [addName, setAddName] = useState('')
  const [addApp, setAddApp] = useState('')

  if (error) {
    return <p className='text-muted-foreground'>Failed to load routing</p>
  }

  if (isLoading) {
    return <Skeleton className='h-32 w-full' />
  }

  const classes = Object.entries(routingData?.classes ?? {})
  const services = Object.entries(routingData?.services ?? {})
  const paths = Object.entries(routingData?.paths ?? {})
  const apps = appsData?.apps ?? []

  // Collect all available classes, services, and paths from apps
  const allClasses = [...new Set(apps.flatMap((app) => app.classes ?? []))]
  const allServices = [...new Set(apps.flatMap((app) => app.services ?? []))]
  const allPaths = [...new Set(apps.flatMap((app) => app.paths ?? []))]

  // Get current overrides as sets
  const overriddenClasses = new Set(classes.map(([name]) => name))
  const overriddenServices = new Set(services.map(([name]) => name))
  const overriddenPaths = new Set(paths.map(([name]) => name))

  // Available items not yet overridden
  const availableClasses = allClasses.filter((c) => !overriddenClasses.has(c))
  const availableServices = allServices.filter((s) => !overriddenServices.has(s))
  const availablePaths = allPaths.filter((p) => !overriddenPaths.has(p))

  const handleDelete = (type: 'class' | 'service' | 'path', name: string) => {
    setRouting.mutate(
      { type, name },
      {
        onSuccess: () => toast.success('Routing override removed'),
        onError: (err) => toast.error(getErrorMessage(err, 'Failed to remove override')),
      }
    )
  }

  const handleAdd = () => {
    if (addType && addName && addApp) {
      setRouting.mutate(
        { type: addType, name: addName, app: addApp },
        {
          onSuccess: () => {
            toast.success('Routing override added')
            setAddType(null)
            setAddName('')
            setAddApp('')
          },
          onError: (err) => toast.error(getErrorMessage(err, 'Failed to add override')),
        }
      )
    }
  }

  const getAvailableForType = (type: 'class' | 'service' | 'path') => {
    switch (type) {
      case 'class':
        return availableClasses
      case 'service':
        return availableServices
      case 'path':
        return availablePaths
    }
  }

  const renderSection = (
    title: string,
    type: 'class' | 'service' | 'path',
    entries: [string, string][]
  ) => (
    <div className='space-y-2'>
      <h3 className='font-medium text-sm'>{title}</h3>
      {entries.length === 0 ? (
        <p className='text-muted-foreground text-sm'>Using defaults</p>
      ) : (
        <div className='space-y-1'>
          {entries.map(([name, app]) => (
            <div
              key={name}
              className='flex items-center justify-between py-1 px-2 rounded bg-muted/50'
            >
              <span className='text-sm'>
                <code className='font-mono'>{name}</code>
                <span className='text-muted-foreground mx-2'>→</span>
                <code className='font-mono'>{app}</code>
              </span>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => handleDelete(type, name)}
                disabled={setRouting.isPending}
              >
                <Trash2 className='h-4 w-4' />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className='space-y-6'>
      {renderSection('Classes', 'class', classes)}
      {renderSection('Services', 'service', services)}
      {renderSection('Paths', 'path', paths)}

      <Card>
        <CardHeader className='py-3'>
          <CardTitle className='text-base'>Add override</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='flex gap-2 flex-wrap'>
            <Select
              value={addType ?? ''}
              onValueChange={(v) => {
                setAddType(v as 'class' | 'service' | 'path')
                setAddName('')
              }}
            >
              <SelectTrigger className='w-32'>
                <SelectValue placeholder='Type' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='class'>Class</SelectItem>
                <SelectItem value='service'>Service</SelectItem>
                <SelectItem value='path'>Path</SelectItem>
              </SelectContent>
            </Select>

            {addType && (
              <Select value={addName} onValueChange={setAddName}>
                <SelectTrigger className='w-40'>
                  <SelectValue placeholder={`Select ${addType}`} />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableForType(addType).map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {addName && (
              <>
                <span className='text-muted-foreground self-center'>→</span>
                <Select value={addApp} onValueChange={setAddApp}>
                  <SelectTrigger className='w-40'>
                    <SelectValue placeholder='Select app' />
                  </SelectTrigger>
                  <SelectContent>
                    {apps.map((app) => (
                      <SelectItem key={app.id} value={app.id}>
                        {app.label || app.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            {addApp && (
              <Button onClick={handleAdd} disabled={setRouting.isPending}>
                Add
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CleanupSection() {
  const cleanup = useAppsCleanup()

  const handleCleanup = () => {
    cleanup.mutate(undefined, {
      onSuccess: (data) => {
        if (data.removed > 0) {
          toast.success(`Removed ${data.removed} unused version(s)`)
        } else {
          toast.info('No unused versions to remove')
        }
      },
      onError: (err) => toast.error(getErrorMessage(err, 'Failed to clean up')),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base flex items-center gap-2'>
          <Trash2 className='h-4 w-4' />
          Cleanup
        </CardTitle>
        <CardDescription>
          Remove app versions that are not being used by any user or track
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant='outline'
          onClick={handleCleanup}
          disabled={cleanup.isPending}
        >
          {cleanup.isPending ? (
            <>
              <RefreshCw className='h-4 w-4 mr-2 animate-spin' />
              Cleaning...
            </>
          ) : (
            'Clean up unused versions'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

export function SystemApps() {
  usePageTitle('Apps')
  const { data: available, isLoading: checkingAvailable } = useAppsAvailable()

  if (checkingAvailable) {
    return (
      <>
        <Header>
          <h1 className='text-lg font-semibold'>Apps</h1>
        </Header>
        <Main>
          <Skeleton className='h-32 w-full' />
        </Main>
      </>
    )
  }

  if (!available?.available) {
    return <AppsNotAvailable version={available?.version ?? 'unknown'} />
  }

  return (
    <>
      <Header>
        <h1 className='text-lg font-semibold'>Apps</h1>
      </Header>

      <Main>
        <Tabs defaultValue='apps' className='space-y-4'>
          <TabsList>
            <TabsTrigger value='apps'>
              <Package className='h-4 w-4 mr-2' />
              Apps
            </TabsTrigger>
            <TabsTrigger value='routing'>
              <Settings2 className='h-4 w-4 mr-2' />
              Routing
            </TabsTrigger>
          </TabsList>

          <TabsContent value='apps' className='space-y-4'>
            <AppsList />
            <CleanupSection />
          </TabsContent>

          <TabsContent value='routing'>
            <RoutingTab />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
