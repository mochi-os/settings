import { useState } from 'react'
import { Loader2, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Header,
  Main,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  usePageTitle,
  getErrorMessage,
} from '@mochi/common'
import {
  useUserAppsData,
  useSetUserAppVersion,
  useSetUserAppRouting,
  useResetUserApps,
} from '@/hooks/use-user-apps'

function VersionsTab() {
  const { data, isLoading, error } = useUserAppsData()
  const setVersion = useSetUserAppVersion()

  if (error) {
    return <p className='text-muted-foreground'>Failed to load app data</p>
  }

  if (isLoading) {
    return (
      <div className='space-y-3'>
        <Skeleton className='h-24 w-full' />
        <Skeleton className='h-24 w-full' />
      </div>
    )
  }

  const apps = data?.apps ?? []
  const versions = data?.versions ?? {}

  const handleSetVersion = (appId: string, version: string, track: string) => {
    setVersion.mutate(
      { app: appId, version, track },
      {
        onSuccess: () => toast.success('App preference updated'),
        onError: (err) => toast.error(getErrorMessage(err, 'Failed to update preference')),
      }
    )
  }

  const handleClear = (appId: string) => {
    setVersion.mutate(
      { app: appId, version: '', track: '' },
      {
        onSuccess: () => toast.success('Using system default'),
        onError: (err) => toast.error(getErrorMessage(err, 'Failed to clear preference')),
      }
    )
  }

  return (
    <div className='space-y-3'>
      <p className='text-sm text-muted-foreground'>
        Override system defaults to use a specific app version or track.
      </p>
      {apps.map((app) => {
        const pref = versions[app.id]
        const hasPreference = pref?.version || pref?.track

        return (
          <Card key={app.id}>
            <CardHeader className='py-3'>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-base'>{app.label || app.id}</CardTitle>
                <Badge variant='secondary'>{app.version}</Badge>
              </div>
              <CardDescription className='text-xs'>
                {hasPreference ? (
                  pref?.track ? (
                    <span>Following track: {pref.track}</span>
                  ) : (
                    <span>Pinned to version: {pref.version}</span>
                  )
                ) : (
                  <span>Using system default</span>
                )}
              </CardDescription>
            </CardHeader>
            {app.versions.length > 1 && (
              <CardContent className='pt-0'>
                <div className='flex gap-2 flex-wrap items-center'>
                  <Select
                    value={pref?.version || ''}
                    onValueChange={(v) => handleSetVersion(app.id, v, '')}
                    disabled={setVersion.isPending}
                  >
                    <SelectTrigger className='w-32'>
                      <SelectValue placeholder='Version' />
                    </SelectTrigger>
                    <SelectContent>
                      {app.versions.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {hasPreference && (
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => handleClear(app.id)}
                      disabled={setVersion.isPending}
                    >
                      <Trash2 className='h-4 w-4 mr-1' />
                      Clear
                    </Button>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}
      {apps.length === 0 && (
        <p className='text-muted-foreground text-sm'>No apps installed</p>
      )}
    </div>
  )
}

function RoutingTab() {
  const { data, isLoading, error } = useUserAppsData()
  const setRouting = useSetUserAppRouting()
  const [addType, setAddType] = useState<'class' | 'service' | 'path' | null>(null)
  const [addName, setAddName] = useState('')
  const [addApp, setAddApp] = useState('')

  if (error) {
    return <p className='text-muted-foreground'>Failed to load routing data</p>
  }

  if (isLoading) {
    return <Skeleton className='h-32 w-full' />
  }

  const classes = Object.entries(data?.classes ?? {})
  const services = Object.entries(data?.services ?? {})
  const paths = Object.entries(data?.paths ?? {})
  const apps = data?.apps ?? []

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
        <p className='text-muted-foreground text-sm'>Using system defaults</p>
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
      <p className='text-sm text-muted-foreground'>
        Override which app handles specific entity classes, services, or URL paths.
      </p>

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

export function UserApps() {
  usePageTitle('App preferences')
  const { data, isLoading } = useUserAppsData()
  const resetApps = useResetUserApps()

  // Check if user has any overrides
  const hasOverrides =
    data &&
    (Object.keys(data.versions).length > 0 ||
      Object.keys(data.classes).length > 0 ||
      Object.keys(data.services).length > 0 ||
      Object.keys(data.paths).length > 0)

  const handleReset = () => {
    resetApps.mutate(undefined, {
      onSuccess: () => toast.success('All app preferences reset to system defaults'),
      onError: (err) => toast.error(getErrorMessage(err, 'Failed to reset preferences')),
    })
  }

  return (
    <>
      <Header>
        <h1 className='text-lg font-semibold'>App preferences</h1>
      </Header>

      <Main>
        <Tabs defaultValue='versions' className='space-y-4'>
          <TabsList>
            <TabsTrigger value='versions'>Versions</TabsTrigger>
            <TabsTrigger value='routing'>Routing</TabsTrigger>
          </TabsList>

          <TabsContent value='versions'>
            <VersionsTab />
          </TabsContent>

          <TabsContent value='routing'>
            <RoutingTab />
          </TabsContent>
        </Tabs>

        {hasOverrides && (
          <div className='mt-6 flex justify-end'>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant='outline'
                  disabled={isLoading || resetApps.isPending}
                >
                  {resetApps.isPending ? (
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  ) : (
                    <RotateCcw className='mr-2 h-4 w-4' />
                  )}
                  Reset all to defaults
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset app preferences?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all your app version and routing overrides,
                    returning to system defaults.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </Main>
    </>
  )
}
