import { useState } from 'react'
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
  usePageTitle,
  useTheme,
  shellSetLocale,
  useLocale,
} from '@mochi/web'
import type { ThemeInfo, LocalePreferences } from '@mochi/web'
import {
  detectDateFormat,
  detectTimeFormat,
  detectWeekStart,
  detectNumberFormat,
  detectUnits,
} from '@mochi/web'
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
  const { setTheme, setColorTheme } = useTheme()
  const { raw: currentLocale } = useLocale()
  const [themeSheetOpen, setThemeSheetOpen] = useState(false)

  const localeKeys = ['date_format', 'time_format', 'timestamp_display', 'week_start', 'number_format', 'units'] as const

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
    setPreference.mutate(
      { theme: themeId },
      {
        onSuccess: () => {
          if (theme) {
            const overrides = { ...theme.overrides }
            if (theme.border_radius) overrides['--radius'] = theme.border_radius
            setColorTheme({
              hue: String(theme.hue),
              chroma: String(theme.chroma),
              hueBg: String(theme.hue_bg),
              overrides,
            })
          } else {
            setColorTheme(null)
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
        toast.success('Preferences reset to defaults')
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to reset preferences'))
      },
    })
  }

  return (
    <>
      <PageHeader title="Preferences" icon={<Sliders className='size-4 md:size-5' />} />

      <Main className="space-y-8">
        {!error && (
          <div className="flex justify-end">
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
          </div>
        )}

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
            </div>
          </Section>
        )}
      </Main>
    </>
  )
}
