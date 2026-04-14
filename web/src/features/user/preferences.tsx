import { useEffect, useState } from 'react'
import { Loader2, RotateCcw, Sliders, Check, ChevronRight } from 'lucide-react'
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
  Button,
  cn,
  FieldRow,
  GeneralError,
  ListSkeleton,
  Main,
  PageHeader,
  Section,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  TimezoneSelect,
  getErrorMessage,
  appearanceLabels,
  dateFormatLabels,
  timeFormatLabels,
  timestampDisplayLabels,
  weekStartLabels,
  numberFormatLabels,
  unitLabels,
  toast,
  type ThemeInfo,
  usePageTitle,
  useTheme,
  shellSetLocale,
  useLocale,
} from '@mochi/web'
import type { LocalePreferences } from '@mochi/web'
import {
  detectDateFormat,
  detectTimeFormat,
  detectWeekStart,
  detectNumberFormat,
  detectUnits,
} from '@mochi/web'
type RadiusOverrides = Record<string, string>

// All five radius vars must be set together — the derived vars (--radius-sm/md/lg/xl)
// are hardcoded in :root in theme.css (unlayered), which wins over @theme inline (layered),
// so setting only --radius is insufficient.
const radiusPresetOverrides: Record<string, RadiusOverrides> = {
  none:   { '--radius': '0rem',    '--radius-sm': '0rem',    '--radius-md': '0rem',    '--radius-lg': '0rem',    '--radius-xl': '0rem'    },
  small:  { '--radius': '0.375rem','--radius-sm': '0.125rem','--radius-md': '0.25rem', '--radius-lg': '0.375rem','--radius-xl': '0.625rem'},
  medium: { '--radius': '0.75rem', '--radius-sm': '0.5rem',  '--radius-md': '0.625rem','--radius-lg': '0.75rem', '--radius-xl': '1rem'    },
  large:  { '--radius': '1.75rem', '--radius-sm': '1.5rem',  '--radius-md': '1.625rem','--radius-lg': '1.75rem', '--radius-xl': '2rem'    },
}
const radiusVarKeys = ['--radius', '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl'] as const

function radiusOverridesFromThemeBase(baseRadius: string): RadiusOverrides {
  return {
    '--radius': baseRadius,
    '--radius-sm': `calc(${baseRadius} - 4px)`,
    '--radius-md': `calc(${baseRadius} - 2px)`,
    '--radius-lg': baseRadius,
    '--radius-xl': `calc(${baseRadius} + 4px)`,
  }
}

function radiusOverridesFromPreference(value: string): RadiusOverrides | null {
  if (!value || value === 'default') return null
  return radiusPresetOverrides[value] ?? null
}

const radiusRx: Record<string, number> = { none: 0, small: 2, medium: 4, default: 6, large: 9 }

function RadiusIcon({ value }: { value: string }) {
  const rx = radiusRx[value] ?? 6
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-foreground" aria-hidden>
      <rect x="1.5" y="1.5" width="13" height="13" rx={rx} stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

import { ComboSelect } from '@/components/combo-select'
import {
  usePreferencesData,
  useSetPreference,
  useResetPreferences,
} from '@/hooks/use-preferences'

export function UserPreferences() {
  usePageTitle('Preferences')
  const { data, isLoading, error, refetch } = usePreferencesData()
  const setPreference = useSetPreference()
  const resetPreferences = useResetPreferences()
  const { setTheme, setColorTheme, colorTheme } = useTheme()
  const { raw: currentLocale } = useLocale()
  const [themeSheetOpen, setThemeSheetOpen] = useState(false)

  const localeKeys = ['date_format', 'time_format', 'timestamp_display', 'week_start', 'number_format', 'units'] as const

  useEffect(() => {
    if (!data) return

    const appearance = data.preferences.appearance
    if (appearance === 'light' || appearance === 'dark') {
      setTheme(appearance)
    } else {
      setTheme('system')
    }

    const rOvr = radiusOverridesFromPreference(data.preferences.border_radius)

    const theme = data.themes?.find((t) => t.id === data.preferences.theme)
    if (!theme) {
      setColorTheme(
        rOvr
          ? { hue: '250', chroma: '0.16', hueBg: '250', overrides: rOvr }
          : null
      )
      return
    }

    const overrides: Record<string, string> = { ...theme.overrides }
    if (theme.background_url) {
      overrides['--background-image'] = `url(${theme.background_url})`
    }
    if (theme.border_radius) Object.assign(overrides, radiusOverridesFromThemeBase(theme.border_radius))
    // User radius pref overrides theme's border_radius — set all derived vars
    if (rOvr) {
      Object.assign(overrides, rOvr)
    }
    setColorTheme({
      hue: String(theme.hue),
      chroma: String(theme.chroma),
      hueBg: String(theme.hue_bg),
      overrides,
    })
  }, [data, setColorTheme, setTheme])

  const handleChange = (key: string, value: string) => {
    setPreference.mutate(
      { [key]: value },
      {
        onSuccess: () => {
          if (key === 'appearance') {
            setTheme(value === 'auto' ? 'system' : (value as 'light' | 'dark'))
          }
          if ((localeKeys as readonly string[]).includes(key) || key === 'timezone') {
            const updated = { ...currentLocale, [key]: value } as LocalePreferences
            shellSetLocale(updated)
          }
          if (key === 'border_radius') {
            const rOvr = radiusOverridesFromPreference(value)
            const updatedOverrides = { ...colorTheme?.overrides }
            for (const k of radiusVarKeys) delete updatedOverrides[k]
            if (rOvr) Object.assign(updatedOverrides, rOvr)
            if (colorTheme) {
              setColorTheme({ ...colorTheme, overrides: updatedOverrides })
            } else if (rOvr) {
              setColorTheme({ hue: '250', chroma: '0.16', hueBg: '250', overrides: rOvr })
            }
          }
          toast.success('Preference updated')
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, 'Failed to update preference'))
        },
      }
    )
  }

  const handleThemeChange = (theme: ThemeInfo | null) => {
    const themeId = theme ? theme.id : ''
    const userRadiusOverride = radiusOverridesFromPreference(data?.preferences.border_radius || 'default')
    setPreference.mutate(
      { theme: themeId },
      {
        onSuccess: () => {
          if (theme) {
            const overrides: Record<string, string> = { ...theme.overrides }
            if (theme.background_url) overrides['--background-image'] = `url(${theme.background_url})`
            if (theme.border_radius) Object.assign(overrides, radiusOverridesFromThemeBase(theme.border_radius))
            if (userRadiusOverride) Object.assign(overrides, userRadiusOverride)
            setColorTheme({
              hue: String(theme.hue),
              chroma: String(theme.chroma),
              hueBg: String(theme.hue_bg),
              overrides,
            })
          } else {
            if (userRadiusOverride) {
              setColorTheme({ hue: '250', chroma: '0.16', hueBg: '250', overrides: userRadiusOverride })
            } else {
              setColorTheme(null)
            }
          }
          toast.success('Theme updated')
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, 'Failed to update theme'))
        },
      }
    )
  }

  const handleReset = () => {
    resetPreferences.mutate(undefined, {
      onSuccess: () => {
        setColorTheme(null)
        setTheme('system')
        toast.success('Preferences reset to defaults')
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to reset preferences'))
      },
    })
  }

  return (
    <>
      <PageHeader
        title="Preferences"
        icon={<Sliders className='size-4 md:size-5' />}
        actions={!error ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant='outline'
                size='sm'
                disabled={isLoading || resetPreferences.isPending}
              >
                {resetPreferences.isPending ? (
                  <Loader2 className='mr-2 h-3.5 w-3.5 animate-spin' />
                ) : (
                  <RotateCcw className='mr-2 h-3.5 w-3.5' />
                )}
                Reset to defaults
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
        ) : undefined}
      />

      <Main className="space-y-8">

        <Section title="Display">
          <div className='divide-y-0'>
            {error ? (
              <GeneralError error={error} minimal mode='inline' reset={refetch} />
            ) : isLoading ? (
              <ListSkeleton variant='simple' height='h-12' count={2} />
            ) : data ? (
              <>
                <FieldRow label='Appearance'>
                  <div className="w-full">
                    <ComboSelect
                      value={data.preferences.appearance}
                      options={appearanceLabels}
                      onChange={(value) => handleChange('appearance', value)}
                      disabled={setPreference.isPending}
                    />
                  </div>
                </FieldRow>

                {data.themes && data.themes.length > 0 && (
                  <FieldRow label='Theme'>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => setThemeSheetOpen(true)}
                    >
                      <span className="flex items-center gap-2">
                        {(() => {
                          const current = data.themes.find(t => t.id === data.preferences.theme)
                          if (current) {
                            return (
                              <>
                                <span className="size-3.5 rounded-full shrink-0" style={{ backgroundColor: current.preview }} />
                                {current.label}
                              </>
                            )
                          }
                          return 'Default'
                        })()}
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </Button>
                  </FieldRow>
                )}
                <FieldRow label='Border radius'>
                  <div className="w-full">
                    <ComboSelect
                      value={data.preferences.border_radius || 'default'}
                      options={{ default: 'Default', none: 'None', small: 'Small', medium: 'Medium', large: 'Large' }}
                      onChange={(value) => handleChange('border_radius', value)}
                      disabled={setPreference.isPending}
                      renderOption={(optValue, label) => (
                        <span className="flex items-center gap-2">
                          <RadiusIcon value={optValue} />
                          {label}
                        </span>
                      )}
                    />
                  </div>
                </FieldRow>

                <Sheet open={themeSheetOpen} onOpenChange={setThemeSheetOpen}>
                  <SheetContent className="overflow-y-auto" onInteractOutside={() => {}}>
                    <SheetHeader>
                      <SheetTitle>Theme</SheetTitle>
                    </SheetHeader>
                    <div className="grid gap-2 pt-4">
                      {(() => {
                        return (data.themes || []).map((theme) => {
                        const isSelected = data.preferences.theme === theme.id
                        return (
                          <button
                            key={theme.id}
                            onClick={() => {
                              handleThemeChange(isSelected ? null : theme)
                              setThemeSheetOpen(false)
                            }}
                            disabled={setPreference.isPending}
                            className={cn(
                              'flex items-center gap-3 rounded-[10px] border p-3 text-left transition-colors',
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            <span
                              className="size-8 rounded-[8px] shrink-0"
                              style={{ backgroundColor: theme.preview }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium">{theme.label}</div>
                            </div>
                            {isSelected && <Check className="size-4 text-primary shrink-0" />}
                          </button>
                        )
                      })
                      })()}
                    </div>
                  </SheetContent>
                </Sheet>
              </>
            ) : null}
          </div>
        </Section>

        {data && !error && (
          <Section title="Regional">
            <div className='divide-y-0'>
              <FieldRow label='Time zone'>
                <div className="w-full">
                  <TimezoneSelect
                    value={data.preferences.timezone}
                    onChange={(value) => handleChange('timezone', value)}
                    disabled={setPreference.isPending}
                  />
                </div>
              </FieldRow>

              <FieldRow label='Units'>
                <div className="w-full">
                  <ComboSelect
                    value={data.preferences.units || 'auto'}
                    options={{ ...unitLabels, auto: `${unitLabels.auto} (${unitLabels[detectUnits()] || detectUnits()})` }}
                    onChange={(value) => handleChange('units', value)}
                    disabled={setPreference.isPending}
                  />
                </div>
              </FieldRow>

              <FieldRow label='Number format'>
                <div className="w-full">
                  <ComboSelect
                    value={data.preferences.number_format || 'auto'}
                    options={{ ...numberFormatLabels, auto: `${numberFormatLabels.auto} (${detectNumberFormat()})` }}
                    onChange={(value) => handleChange('number_format', value)}
                    disabled={setPreference.isPending}
                  />
                </div>
              </FieldRow>

              <FieldRow label='Date format'>
                <div className="w-full">
                  <ComboSelect
                    value={data.preferences.date_format || 'auto'}
                    options={{ ...dateFormatLabels, auto: `${dateFormatLabels.auto} (${detectDateFormat()})` }}
                    onChange={(value) => handleChange('date_format', value)}
                    disabled={setPreference.isPending}
                  />
                </div>
              </FieldRow>

              <FieldRow label='Time format'>
                <div className="w-full">
                  <ComboSelect
                    value={data.preferences.time_format || 'auto'}
                    options={{ ...timeFormatLabels, auto: `${timeFormatLabels.auto} (${detectTimeFormat() === '12h' ? '12 hours' : '24 hours'})` }}
                    onChange={(value) => handleChange('time_format', value)}
                    disabled={setPreference.isPending}
                  />
                </div>
              </FieldRow>

              <FieldRow label='Week starts on'>
                <div className="w-full">
                  <ComboSelect
                    value={data.preferences.week_start || 'auto'}
                    options={{
                      ...weekStartLabels,
                      auto: `${weekStartLabels.auto} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][detectWeekStart()]})`,
                    }}
                    onChange={(value) => handleChange('week_start', value)}
                    disabled={setPreference.isPending}
                  />
                </div>
              </FieldRow>

              <FieldRow label='Timestamps'>
                <div className="w-full">
                  <ComboSelect
                    value={data.preferences.timestamp_display || 'auto'}
                    options={timestampDisplayLabels}
                    onChange={(value) => handleChange('timestamp_display', value)}
                    disabled={setPreference.isPending}
                  />
                </div>
              </FieldRow>
            </div>
          </Section>
        )}
      </Main>
    </>
  )
}
