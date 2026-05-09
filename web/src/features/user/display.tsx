import { useEffect, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  Loader2,
  RotateCcw,
  Palette,
  ChevronRight,
  Monitor,
  Moon,
  Sun,
} from 'lucide-react'
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
  FieldRow,
  GeneralError,
  ListSkeleton,
  Main,
  PageHeader,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  getErrorMessage,
  useAppearanceLabels,
  useDensityLabels,
  useRadiusLabels,
  useBackgroundLabels,
  useFontLabels,
  useFontSizeLabels,
  toast,
  type ThemeInfo,
  usePageTitle,
  useTheme,
} from '@mochi/web'

type ThemeOverridePrefs = {
  density: string
  radius: string
  background: string
  font: string
  font_size: string
}

const FONT_SIZE_PCT: Record<string, string> = {
  small: '87.5%',
  normal: '100%',
  large: '112.5%',
  'extra-large': '125%',
}

// Mirror of font_stacks() in core/server/themes.go. Empty string means
// "no override" — the density preset (or theme's font_sans/font_mono)
// keeps its value.
const FONT_STACKS: Record<string, { sans: string; mono?: string }> = {
  system: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
  serif: {
    sans: 'Georgia, "Times New Roman", Cambria, "Source Serif Pro", serif',
  },
  dyslexia: {
    sans: '"Atkinson Hyperlegible", "OpenDyslexic", "Comic Sans MS", sans-serif',
  },
}

type ColorThemeState = {
  hue: string
  chroma: string
  hueBg: string
  overrides: Record<string, string>
}

function colorThemeFromSelections(
  themes: ThemeInfo[] | undefined,
  selectedThemeId: string | undefined,
  prefs: ThemeOverridePrefs,
  presets: Record<string, Record<string, string>> | undefined,
): ColorThemeState | null {
  const theme = themes?.find((t) => t.id === selectedThemeId)

  // Effective values: user override (anything other than "theme") wins,
  // else inherit from the active theme.
  const effectiveDensity =
    prefs.density !== 'theme' ? prefs.density : (theme?.spacing ?? '')
  const effectiveRadius =
    prefs.radius !== 'theme' ? prefs.radius : theme?.border_radius
  const showBackground = prefs.background !== 'off'

  // Density preset bundle comes from the server (mochi.app.presets)
  // so the table doesn't drift from the SSR copy in core/server/themes.go.
  const styleOverrides = effectiveDensity ? presets?.[effectiveDensity] : null

  const overrides: Record<string, string> = { ...(theme?.overrides ?? {}) }
  if (theme?.background_url && showBackground) {
    overrides['--background-image'] = `url(${theme.background_url})`
  }
  if (effectiveRadius) {
    overrides['--radius'] = effectiveRadius
  }
  if (styleOverrides) Object.assign(overrides, styleOverrides)
  // Theme's own font_sans/font_mono override the density preset.
  if (theme?.font_sans) overrides['--font-sans'] = theme.font_sans
  if (theme?.font_mono) overrides['--font-mono'] = theme.font_mono
  // User's font preference overrides theme.
  const fontStack = FONT_STACKS[prefs.font]
  if (fontStack) {
    overrides['--font-sans'] = fontStack.sans
    if (fontStack.mono) overrides['--font-mono'] = fontStack.mono
  }
  if (FONT_SIZE_PCT[prefs.font_size]) {
    overrides['font-size'] = FONT_SIZE_PCT[prefs.font_size]
  }

  if (theme) {
    return {
      hue: String(theme.hue),
      chroma: String(theme.chroma),
      hueBg: String(theme.hue_bg),
      overrides,
    }
  }
  if (Object.keys(overrides).length === 0) return null
  return { hue: '', chroma: '', hueBg: '', overrides }
}

function prefsFromData(prefs: Record<string, string>): ThemeOverridePrefs {
  return {
    density: prefs.density || 'theme',
    radius: prefs.radius || 'theme',
    background: prefs.background || 'theme',
    font: prefs.font || 'theme',
    font_size: prefs.font_size || 'theme',
  }
}

function AppearanceIcon({ value }: { value: string }) {
  switch (value) {
    case 'light':
      return <Sun className='size-4 shrink-0 text-muted-foreground' strokeWidth={1.8} aria-hidden />
    case 'dark':
      return <Moon className='size-4 shrink-0 text-muted-foreground' strokeWidth={1.8} aria-hidden />
    default:
      return <Monitor className='size-4 shrink-0 text-muted-foreground' strokeWidth={1.8} aria-hidden />
  }
}

function AppearanceLabel({
  value,
  label,
}: {
  value: string
  label: string
}) {
  return (
    <span className='flex min-w-0 items-center gap-2'>
      <AppearanceIcon value={value} />
      <span className='truncate'>{label}</span>
    </span>
  )
}

import { ComboSelect } from '@/components/combo-select'
import { ThemePreviewCard } from '@/components/theme-preview-card'
import {
  usePreferencesData,
  useSetPreference,
  useResetPreferences,
} from '@/hooks/use-preferences'

const DISPLAY_PREF_KEYS = ['appearance', 'theme', 'density', 'radius', 'background', 'font', 'font_size'] as const

export function UserDisplay() {
  const { t } = useLingui()
  const appearanceLabels = useAppearanceLabels()
  const densityLabels = useDensityLabels()
  const radiusLabels = useRadiusLabels()
  const backgroundLabels = useBackgroundLabels()
  const fontLabels = useFontLabels()
  const fontSizeLabels = useFontSizeLabels()
  usePageTitle(t`Display`)
  const { data, isLoading, error, refetch } = usePreferencesData()
  const setPreference = useSetPreference()
  const resetPreferences = useResetPreferences()
  const { setTheme, setColorTheme } = useTheme()
  const [themeSheetOpen, setThemeSheetOpen] = useState(false)

  useEffect(() => {
    if (!data) return
    const appearance = data.preferences.appearance
    if (appearance === 'light' || appearance === 'dark') {
      setTheme(appearance)
    } else {
      setTheme('system')
    }
    setColorTheme(
      colorThemeFromSelections(
        data.themes,
        data.preferences.theme,
        prefsFromData(data.preferences),
        data.presets,
      )
    )
  }, [data, setColorTheme, setTheme])

  const themeOverrideKeys = ['density', 'radius', 'background', 'font', 'font_size'] as const

  const handleChange = (key: string, value: string) => {
    setPreference.mutate(
      { [key]: value },
      {
        onSuccess: () => {
          if (key === 'appearance') {
            setTheme(value === 'auto' ? 'system' : (value as 'light' | 'dark'))
          }
          if ((themeOverrideKeys as readonly string[]).includes(key) && data) {
            const updated = { ...prefsFromData(data.preferences), [key]: value }
            setColorTheme(
              colorThemeFromSelections(data.themes, data.preferences.theme, updated, data.presets)
            )
          }
          toast.success(t`Preference updated`)
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, t`Failed to update preference`))
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
          setColorTheme(
            colorThemeFromSelections(
              data?.themes,
              themeId,
              data ? prefsFromData(data.preferences) : { density: 'theme', radius: 'theme', background: 'theme', font: 'theme', font_size: 'theme' },
              data?.presets,
            )
          )
          toast.success(t`Theme updated`)
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, t`Failed to update theme`))
        },
      }
    )
  }

  const handleReset = () => {
    if (!data) return
    // Reset only the display-related keys, leaving regional prefs alone.
    const resetPayload: Record<string, string> = {}
    for (const key of DISPLAY_PREF_KEYS) {
      resetPayload[key] = ''
    }
    setPreference.mutate(resetPayload, {
      onSuccess: () => {
        setColorTheme(null)
        setTheme('system')
        toast.success(t`Display reset to defaults`)
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, t`Failed to reset display`))
      },
    })
  }

  return (
    <>
      <PageHeader
        title={t`Display`}
        icon={<Palette className='size-4 md:size-5' />}
        actions={!error ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant='outline'
                size='sm'
                disabled={isLoading || setPreference.isPending || resetPreferences.isPending}
              >
                {setPreference.isPending ? (
                  <Loader2 className='me-2 h-3.5 w-3.5 animate-spin' />
                ) : (
                  <RotateCcw className='me-2 h-3.5 w-3.5' />
                )}
                <Trans>Reset to defaults</Trans>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle><Trans>Reset display?</Trans></AlertDialogTitle>
                <AlertDialogDescription>
                  <Trans>This will reset display settings to their default values.</Trans>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel><Trans>Cancel</Trans></AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>
                  <Trans>Reset</Trans>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : undefined}
      />

      <Main className="space-y-6">
        {error ? (
          <GeneralError error={error} minimal mode='inline' reset={refetch} />
        ) : isLoading ? (
          <ListSkeleton variant='simple' height='h-12' count={6} />
        ) : data ? (
          <div className='divide-y-0'>
            <FieldRow label={t`Appearance`}>
              <div className="w-full">
                <ComboSelect
                  value={data.preferences.appearance}
                  options={appearanceLabels}
                  onChange={(value) => handleChange('appearance', value)}
                  disabled={setPreference.isPending}
                  renderOption={(optValue, label) => (
                    <AppearanceLabel value={optValue} label={label} />
                  )}
                  renderValue={(optValue, label) => (
                    <AppearanceLabel value={optValue} label={label} />
                  )}
                />
              </div>
            </FieldRow>

            {(data.themes ?? []).length > 0 && (
              <FieldRow label={t`Theme`}>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => setThemeSheetOpen(true)}
                >
                  <span className="flex items-center gap-2">
                    {(() => {
                      const current = (data.themes ?? []).find(theme => theme.id === data.preferences.theme)
                      if (current) {
                        return (
                          <>
                            <span className="size-3.5 rounded-full shrink-0" style={{ backgroundColor: current.preview }} />
                            {current.development ? t`${current.label} (development)` : current.label}
                          </>
                        )
                      }
                      return t`Default`
                    })()}
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground rtl:rotate-180" />
                </Button>
              </FieldRow>
            )}
            <Sheet open={themeSheetOpen} onOpenChange={setThemeSheetOpen}>
              <SheetContent className="overflow-y-auto sm:max-w-md" onInteractOutside={() => {}}>
                <SheetHeader>
                  <SheetTitle><Trans>Theme</Trans></SheetTitle>
                </SheetHeader>
                <div className="grid grid-cols-2 gap-4 px-1 pt-4 pb-6">
                  {(data.themes ?? []).map((theme) => {
                    const isSelected = data.preferences.theme === theme.id
                    return (
                      <ThemePreviewCard
                        key={theme.id}
                        theme={theme}
                        presets={data.presets}
                        isSelected={isSelected}
                        onClick={() => {
                          handleThemeChange(isSelected ? null : theme)
                        }}
                        disabled={setPreference.isPending}
                      />
                    )
                  })}
                </div>
              </SheetContent>
            </Sheet>

            <FieldRow label={t`Density`}>
              <div className="w-full">
                <ComboSelect
                  value={data.preferences.density || 'theme'}
                  options={densityLabels}
                  onChange={(value) => handleChange('density', value)}
                  disabled={setPreference.isPending}
                />
              </div>
            </FieldRow>

            <FieldRow label={t`Radius`}>
              <div className="w-full">
                <ComboSelect
                  value={data.preferences.radius || 'theme'}
                  options={radiusLabels}
                  onChange={(value) => handleChange('radius', value)}
                  disabled={setPreference.isPending}
                />
              </div>
            </FieldRow>

            <FieldRow label={t`Background`}>
              <div className="w-full">
                <ComboSelect
                  value={data.preferences.background || 'theme'}
                  options={backgroundLabels}
                  onChange={(value) => handleChange('background', value)}
                  disabled={setPreference.isPending}
                />
              </div>
            </FieldRow>

            <FieldRow label={t`Font`}>
              <div className="w-full">
                <ComboSelect
                  value={data.preferences.font || 'theme'}
                  options={fontLabels}
                  onChange={(value) => handleChange('font', value)}
                  disabled={setPreference.isPending}
                />
              </div>
            </FieldRow>

            <FieldRow label={t`Font size`}>
              <div className="w-full">
                <ComboSelect
                  value={data.preferences.font_size || 'theme'}
                  options={fontSizeLabels}
                  onChange={(value) => handleChange('font_size', value)}
                  disabled={setPreference.isPending}
                />
              </div>
            </FieldRow>
          </div>
        ) : null}
      </Main>
    </>
  )
}
