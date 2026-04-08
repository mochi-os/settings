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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  TimezoneSelect,
  getErrorMessage,
  appearanceLabels,
  toast,
  usePageTitle,
  useTheme,
} from '@mochi/web'
import type { ThemeInfo } from '@mochi/web'
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
  const [themeSheetOpen, setThemeSheetOpen] = useState(false)

  const handleChange = (key: 'appearance' | 'timezone', value: string) => {
    setPreference.mutate(
      { [key]: value },
      {
        onSuccess: () => {
          if (key === 'appearance') {
            setTheme(value === 'auto' ? 'system' : (value as 'light' | 'dark'))
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
            const overrides: Record<string, string> = { ...theme.overrides }
            if (theme.background_url) overrides['--background-image'] = `url(${theme.background_url})`
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
      <PageHeader title="Preferences" icon={<Sliders className='size-4 md:size-5' />} />

      <Main className="space-y-8">
        <Section
          title="General"
          description="Manage your display settings and preferences"
          action={
            !error && <AlertDialog>
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
            {error ? (
              <GeneralError error={error} minimal mode='inline' reset={refetch} />
            ) : isLoading ? (
              <ListSkeleton variant='simple' height='h-12' count={2} />
            ) : data ? (
              <>
                <FieldRow label='Appearance' description='Light or dark mode'>
                  <div className="w-full sm:w-64">
                    <Select
                      value={data.preferences.appearance}
                      onValueChange={(value) => handleChange('appearance', value)}
                      disabled={setPreference.isPending}
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(appearanceLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </FieldRow>

                {data.themes && data.themes.length > 0 && (
                  <FieldRow label='Theme' description='Color palette'>
                    <Button
                      variant="outline"
                      className="w-full sm:w-64 justify-between"
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
