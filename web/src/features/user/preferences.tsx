import { useState, useMemo } from 'react'
import { Check, ChevronsUpDown, Loader2, RotateCcw, Sliders } from 'lucide-react'
import {
  cn,
  useTheme,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  PageHeader,
  Main,
  usePageTitle,
  getErrorMessage,
  toast,
  Section,
  FieldRow,
} from '@mochi/common'
import {
  usePreferencesData,
  useSetPreference,
  useResetPreferences,
} from '@/hooks/use-preferences'

const themeLabels: Record<string, string> = {
  light: 'Light',
  dark: 'Dark',
  auto: 'System',
}

function getTimezones(): string[] {
  try {
    return (
      (
        Intl as { supportedValuesOf?: (key: string) => string[] }
      ).supportedValuesOf?.('timeZone') ?? []
    )
  } catch {
    return []
  }
}

function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

function TimezoneSelect({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const timezones = useMemo(() => getTimezones(), [])
  const browserTimezone = useMemo(() => getBrowserTimezone(), [])

  const formatTimezone = (tz: string) => tz.replace(/_/g, ' ')
  const displayValue =
    value === 'auto'
      ? `Auto (${formatTimezone(browserTimezone)})`
      : formatTimezone(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className='w-full justify-between'
          disabled={disabled}
        >
          <span className='truncate'>{displayValue}</span>
          <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[350px] p-0' align="start">
        <Command>
          <CommandInput placeholder='Search time zone...' />
          <CommandList>
            <CommandEmpty>No time zone found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value='auto'
                onSelect={() => {
                  onChange('auto')
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4 shrink-0',
                    value === 'auto' ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <span className='truncate'>
                  Auto ({formatTimezone(browserTimezone)})
                </span>
              </CommandItem>
              {timezones.map((tz) => (
                <CommandItem
                  key={tz}
                  value={tz}
                  onSelect={() => {
                    onChange(tz)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0',
                      value === tz ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className='truncate'>{formatTimezone(tz)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function UserPreferences() {
  usePageTitle('Preferences')
  const { data, isLoading, error } = usePreferencesData()
  const setPreference = useSetPreference()
  const resetPreferences = useResetPreferences()
  const { setTheme } = useTheme()

  const handleChange = (key: string, value: string) => {
    if (key === 'theme') {
      const themeValue =
        value === 'auto' ? 'system' : (value as 'light' | 'dark')
      setTheme(themeValue)
    }
    setPreference.mutate(
      { [key]: value },
      {
        onSuccess: () => {
          toast.success('Preference updated')
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, 'Failed to update preference'))
        },
      }
    )
  }

  const handleReset = () => {
    resetPreferences.mutate(undefined, {
      onSuccess: () => {
        toast.success('Preferences reset to defaults')
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to reset preferences'))
      },
    })
  }

  if (error) {
    return (
      <>
        <PageHeader title="Preferences" icon={<Sliders className='size-4 md:size-5' />} />
        <Main>
          <p className='text-muted-foreground'>Failed to load preferences</p>
        </Main>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Preferences" icon={<Sliders className='size-4 md:size-5' />} />

      <Main className="space-y-8">
        <Section 
          title="General" 
          description="Manage your display settings and preferences"
          action={
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  disabled={isLoading || resetPreferences.isPending}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {resetPreferences.isPending ? (
                    <Loader2 className='mr-2 h-3.5 w-3.5 animate-spin' />
                  ) : (
                    <RotateCcw className='mr-2 h-3.5 w-3.5' />
                  )}
                  Reset to Defaults
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset preferences?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will reset all preferences to their default values.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset}>
                    Reset
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          }
        >
          <div className='divide-y-0'>
            {isLoading ? (
              <div className='space-y-6 py-4'>
                <Skeleton className='h-12 w-full' />
                <Skeleton className='h-12 w-full' />
              </div>
            ) : data ? (
              <>
                <FieldRow label='Theme' description='Appearance'>
                  <div className="w-full sm:w-64">
                    <Select
                      value={data.preferences.theme}
                      onValueChange={(value) => handleChange('theme', value)}
                      disabled={setPreference.isPending}
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(themeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </FieldRow>

                <FieldRow
                  label='Time zone'
                  description='Used for displaying dates and times'
                >
                  <div className="w-full sm:w-64">
                    <TimezoneSelect
                      value={data.preferences.timezone}
                      onChange={(value) => handleChange('timezone', value)}
                      disabled={setPreference.isPending}
                    />
                  </div>
                </FieldRow>
              </>
            ) : null}
          </div>
        </Section>
      </Main>
    </>
  )
}
