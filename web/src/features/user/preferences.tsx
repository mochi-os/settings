import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  Loader2,
  RotateCcw,
  Sliders,
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
  Section,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  TimezoneSelect,
  getErrorMessage,
  useAppearanceLabels,
  useDateFormatLabels,
  useTimeFormatLabels,
  useTimestampDisplayLabels,
  useWeekStartLabels,
  useNumberFormatLabels,
  useUnitLabels,
  toast,
  type ThemeInfo,
  usePageTitle,
  useTheme,
  shellSetLocale,
  shellSetLanguage,
  useLocale,
  detectDateFormat,
  detectTimeFormat,
  detectWeekStart,
  detectNumberFormat,
  detectUnits,
  detectLanguage,
  type LocalePreferences,
} from '@mochi/web'
type StyleOverrides = Record<string, string>

const densityPresetOverrides: Record<string, StyleOverrides> = {
  compact: {
    '--control-height-xs': '1.5rem',
    '--control-height-sm': '1.75rem',
    '--control-height-md': '2rem',
    '--control-height-lg': '2.25rem',
    '--input-h': '2rem',
    '--card-px': '1.25rem',
    '--card-py': '0.875rem',
  },
  comfortable: {
    '--control-height-xs': '1.75rem',
    '--control-height-sm': '2rem',
    '--control-height-md': '2.25rem',
    '--control-height-lg': '2.5rem',
    '--input-h': '2.25rem',
    '--card-px': '1.5rem',
    '--card-py': '1rem',
  },
  spacious: {
    '--control-height-xs': '1.875rem',
    '--control-height-sm': '2.125rem',
    '--control-height-md': '2.5rem',
    '--control-height-lg': '2.75rem',
    '--input-h': '2.5rem',
    '--card-px': '1.75rem',
    '--card-py': '1.25rem',
  },
}

function buildStylePresetOverrides(
  spacingBase: string,
  fontSans: string,
  fontMono: string,
  shadowColor: string,
  density: 'compact' | 'comfortable' | 'spacious',
  borderWidth: string
): StyleOverrides {
  return {
    '--spacing-base': spacingBase,
    '--spacing': spacingBase,
    '--font-sans': fontSans,
    '--font-mono': fontMono,
    '--border-width': borderWidth,
    '--shadow-color': shadowColor,
    '--shadow-2xs': `0 1px 2px ${shadowColor}`,
    '--shadow-xs': `0 1px 3px ${shadowColor}`,
    '--shadow-sm': `0 1px 2px ${shadowColor}, 0 2px 6px ${shadowColor}`,
    '--shadow': `0 2px 8px ${shadowColor}, 0 10px 28px ${shadowColor}`,
    '--shadow-md': `0 4px 12px ${shadowColor}, 0 14px 36px ${shadowColor}`,
    '--shadow-lg': `0 8px 20px ${shadowColor}, 0 20px 48px ${shadowColor}`,
    '--shadow-xl': `0 12px 28px ${shadowColor}, 0 28px 56px ${shadowColor}`,
    '--shadow-2xl': `0 16px 34px ${shadowColor}, 0 36px 72px ${shadowColor}`,
    ...densityPresetOverrides[density],
  }
}

const stylePresetOverrides: Record<string, StyleOverrides> = {
  default: buildStylePresetOverrides(
    '0.3rem',
    "'Nunito Sans', 'Inter', sans-serif",
    "'Fira Code', 'Geist Mono', monospace",
    'rgba(0, 0, 0, 0.12)',
    'spacious',
    '1px'
  ),
  maia: buildStylePresetOverrides(
    '0.3rem',
    "'Nunito Sans', 'Inter', sans-serif",
    "'Fira Code', 'Geist Mono', monospace",
    'rgba(0, 0, 0, 0.12)',
    'spacious',
    '1px'
  ),
  vega: buildStylePresetOverrides(
    '0.215rem',
    "'Public Sans', 'Inter', sans-serif",
    "'IBM Plex Mono', 'Geist Mono', monospace",
    'rgba(0, 0, 0, 0.17)',
    'compact',
    '1px'
  ),
  luma: buildStylePresetOverrides(
    '0.27rem',
    "'Manrope', 'Inter', sans-serif",
    "'IBM Plex Mono', 'Geist Mono', monospace",
    'rgba(0, 0, 0, 0.1)',
    'comfortable',
    '1px'
  ),
  nova: buildStylePresetOverrides(
    '0.255rem',
    "'Poppins', 'Inter', sans-serif",
    "'JetBrains Mono', 'Geist Mono', monospace",
    'rgba(0, 0, 0, 0.18)',
    'comfortable',
    '1.25px'
  ),
  lyra: buildStylePresetOverrides(
    '0.235rem',
    "'Inter Tight', 'Inter', sans-serif",
    "'JetBrains Mono', 'Geist Mono', monospace",
    'rgba(0, 0, 0, 0.22)',
    'compact',
    '1.5px'
  ),
  mira: buildStylePresetOverrides(
    '0.285rem',
    "'DM Sans', 'Inter', sans-serif",
    "'Space Mono', 'Geist Mono', monospace",
    'rgba(0, 0, 0, 0.14)',
    'spacious',
    '1.25px'
  ),
}


function normalizeStylePreset(
  value: string
): 'default' | 'vega' | 'nova' | 'maia' | 'lyra' | 'mira' | 'luma' {
  switch (value) {
    case 'default':
      return 'luma'
    case 'vega':
    case 'nova':
    case 'maia':
    case 'lyra':
    case 'mira':
    case 'luma':
      return value
    case '':
      return 'luma'
    default:
      return 'luma'
  }
}

function radiusOverridesFromThemeBase(baseRadius: string): Record<string, string> {
  return {
    '--radius': baseRadius,
  }
}

function stylePresetOverridesFromPreference(value: string): StyleOverrides | null {
  const preset = normalizeStylePreset(value || 'luma')
  return stylePresetOverrides[preset] ?? null
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
): ColorThemeState | null {
  const theme = themes?.find((t) => t.id === selectedThemeId)
  const spacingToPreset: Record<string, string> = { compact: 'vega', comfortable: 'luma', spacious: 'mira' }
  const styleOverrides = stylePresetOverridesFromPreference(spacingToPreset[theme?.spacing ?? ''] || 'luma')

  if (!theme) {
    const overrides: Record<string, string> = {}
    if (styleOverrides) Object.assign(overrides, styleOverrides)
    if (Object.keys(overrides).length === 0) return null
    return { hue: '', chroma: '', hueBg: '', overrides }
  }

  const overrides: Record<string, string> = { ...theme.overrides }
  if (theme.background_url) {
    overrides['--background-image'] = `url(${theme.background_url})`
  }
  if (theme.border_radius) {
    Object.assign(overrides, radiusOverridesFromThemeBase(theme.border_radius))
  }
  if (styleOverrides) Object.assign(overrides, styleOverrides)

  return {
    hue: String(theme.hue),
    chroma: String(theme.chroma),
    hueBg: String(theme.hue_bg),
    overrides,
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

export function UserPreferences() {
  const { t, i18n } = useLingui()
  const appearanceLabels = useAppearanceLabels()
  const dateFormatLabels = useDateFormatLabels()
  const timeFormatLabels = useTimeFormatLabels()
  const timestampDisplayLabels = useTimestampDisplayLabels()
  const weekStartLabels = useWeekStartLabels()
  const numberFormatLabels = useNumberFormatLabels()
  const unitLabels = useUnitLabels()
  usePageTitle(t`Preferences`)
  const { data, isLoading, error, refetch } = usePreferencesData()
  const setPreference = useSetPreference()
  const resetPreferences = useResetPreferences()
  const { setTheme, setColorTheme } = useTheme()
  const { raw: currentLocale } = useLocale()
  const [themeSheetOpen, setThemeSheetOpen] = useState(false)

  const localeKeys = ['date_format', 'time_format', 'timestamp_display', 'week_start', 'number_format', 'units'] as const

  // Languages installed across all apps' labels/<lang>.conf files. The picker
  // hides the field when only English is present (no real choice yet) — once
  // Phase 2 ships fr/ja/en-us catalogs the picker reveals itself.
  const { data: languagesData } = useQuery<{ languages: string[] }>({
    queryKey: ['_', 'languages'],
    queryFn: () => fetch('/_/languages').then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  })
  const languageOptions = useMemo(() => {
    // Explicit display-name overrides keyed by lower-cased BCP 47 tag. Used
    // where Intl.DisplayNames would return wording that doesn't match
    // Mochi's choice (e.g. en-us → "American English") or that wouldn't
    // sort alongside its parent language in the picker. `en` is overridden
    // because Mochi's source catalog uses neutral English, not UK or US.
    const overrides: Record<string, string> = {
      'en': 'English (international)',
      'en-us': 'English (USA)',
      'es': 'Español (España)',
      'es-419': 'Español (latinoamericano)',
    }
    // Each installed language renders as its native exonym so users recognise
    // their own language by sight (Français, 日本語). The Auto row's
    // parenthetical is descriptive metadata about what Auto would pick, so it
    // renders in the active UI language instead.
    const describe = (tag: string, displayLocale?: string): string => {
      const override = overrides[tag.toLowerCase()]
      if (override) return override
      let name = tag
      try {
        name = new Intl.DisplayNames([displayLocale ?? tag], { type: 'language' }).of(tag) ?? tag
      } catch {
        /* fall back to raw tag */
      }
      if (name.length > 0) {
        name = name.charAt(0).toLocaleUpperCase() + name.slice(1)
      }
      return name
    }
    const tags = languagesData?.languages ?? ['en']
    // Sort: Latin-script natives first (English, Français, Deutsch, …), then
    // non-Latin (العربية, 日本語, 한국어, עברית, …). Within each bucket sort by
    // displayed native name. Backend returns tags alphabetically, which puts
    // 'ar' at the top — visually wrong for English-speaking users who expect
    // their language near the top.
    const scriptBucket = (native: string): number => {
      for (const ch of native) {
        if (/\p{L}/u.test(ch)) {
          return /[A-Za-zÀ-ÿĀ-ſƀ-ɏ]/.test(ch) ? 0 : 1
        }
      }
      return 0
    }
    const sortedTags = [...tags]
      .map((tag) => ({ tag, name: describe(tag) }))
      .sort((a, b) => {
        const ba = scriptBucket(a.name)
        const bb = scriptBucket(b.name)
        if (ba !== bb) return ba - bb
        return a.name.localeCompare(b.name)
      })
      .map(({ tag }) => tag)
    const out: Record<string, string> = {}
    // The Auto suffix should reflect the catalog the resolver will actually
    // load, not the literal browser tag — walk parent chain to closest
    // installed locale (e.g. en-gb → en → "English (international)").
    const installed = new Set(tags.map((s) => s.toLowerCase()))
    let resolved = detectLanguage().toLowerCase()
    while (resolved !== '') {
      if (installed.has(resolved)) break
      const i = resolved.lastIndexOf('-')
      if (i < 0) { resolved = 'en'; break }
      resolved = resolved.slice(0, i)
    }
    out['auto'] = `${t`Detect from web browser`}: ${describe(resolved, i18n.locale)}`
    for (const tag of sortedTags) {
      out[tag] = describe(tag)
    }
    return out
  }, [languagesData, t, i18n.locale])
  const showLanguagePicker = (languagesData?.languages?.length ?? 1) > 1

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
      )
    )
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
          if (key === 'language') {
            // Broadcast to the shell so every open iframe re-activates its
            // Lingui catalog without a page reload. "auto" is stored as the
            // server-side preference but iframes need a concrete tag, so
            // resolve it locally before broadcasting.
            shellSetLanguage(value === 'auto' ? detectLanguage() : value)
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
    resetPreferences.mutate(undefined, {
      onSuccess: () => {
        setColorTheme(null)
        setTheme('system')
        toast.success(t`Preferences reset to defaults`)
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, t`Failed to reset preferences`))
      },
    })
  }

  return (
    <>
      <PageHeader
        title={t`Preferences`}
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
                  <Loader2 className='me-2 h-3.5 w-3.5 animate-spin' />
                ) : (
                  <RotateCcw className='me-2 h-3.5 w-3.5' />
                )}
                <Trans>Reset to defaults</Trans>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle><Trans>Reset preferences?</Trans></AlertDialogTitle>
                <AlertDialogDescription>
                  <Trans>This will reset all preferences to their default values.</Trans>
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

      <Main className="space-y-8">

        <Section title={t`Display`}>
          <div className='divide-y-0'>
            {error ? (
              <GeneralError error={error} minimal mode='inline' reset={refetch} />
            ) : isLoading ? (
              <ListSkeleton variant='simple' height='h-12' count={2} />
            ) : data ? (
              <>
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

                {data.themes && data.themes.length > 0 && (
                  <FieldRow label={t`Theme`}>
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
                          return "Default"
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
                      {(data.themes || []).map((theme) => {
                        const isSelected = data.preferences.theme === theme.id
                        return (
                          <ThemePreviewCard
                            key={theme.id}
                            theme={theme}
                            isSelected={isSelected}
                            onClick={() => {
                              handleThemeChange(isSelected ? null : theme)
                              setThemeSheetOpen(false)
                            }}
                            disabled={setPreference.isPending}
                          />
                        )
                      })}
                    </div>
                  </SheetContent>
                </Sheet>
              </>
            ) : null}
          </div>
        </Section>

        {data && !error && (
          <Section title={t`Regional`}>
            <div className='divide-y-0'>
              {showLanguagePicker && (
                <FieldRow label={t`Language`}>
                  <div className="w-full">
                    <ComboSelect
                      value={data.preferences.language || 'auto'}
                      options={languageOptions}
                      onChange={(value) => handleChange('language', value)}
                      disabled={setPreference.isPending}
                    />
                  </div>
                </FieldRow>
              )}

              <FieldRow label={t`Time zone`}>
                <div className="w-full">
                  <TimezoneSelect
                    value={data.preferences.timezone}
                    onChange={(value) => handleChange('timezone', value)}
                    disabled={setPreference.isPending}
                  />
                </div>
              </FieldRow>

              <FieldRow label={t`Units`}>
                <div className="w-full">
                  <ComboSelect
                    value={data.preferences.units || 'auto'}
                    options={{ ...unitLabels, auto: `${unitLabels.auto}: ${unitLabels[detectUnits()] || detectUnits()}` }}
                    onChange={(value) => handleChange('units', value)}
                    disabled={setPreference.isPending}
                  />
                </div>
              </FieldRow>

              <FieldRow label={t`Number format`}>
                <div className="w-full">
                  <ComboSelect
                    value={data.preferences.number_format || 'auto'}
                    options={{ ...numberFormatLabels, auto: `${numberFormatLabels.auto}: ${detectNumberFormat()}` }}
                    onChange={(value) => handleChange('number_format', value)}
                    disabled={setPreference.isPending}
                  />
                </div>
              </FieldRow>

              <FieldRow label={t`Date format`}>
                <div className="w-full">
                  <ComboSelect
                    value={data.preferences.date_format || 'auto'}
                    options={{ ...dateFormatLabels, auto: `${dateFormatLabels.auto}: ${detectDateFormat()}` }}
                    onChange={(value) => handleChange('date_format', value)}
                    disabled={setPreference.isPending}
                  />
                </div>
              </FieldRow>

              <FieldRow label={t`Time format`}>
                <div className="w-full">
                  <ComboSelect
                    value={data.preferences.time_format || 'auto'}
                    options={{ ...timeFormatLabels, auto: `${timeFormatLabels.auto}: ${timeFormatLabels[detectTimeFormat()] ?? detectTimeFormat()}` }}
                    onChange={(value) => handleChange('time_format', value)}
                    disabled={setPreference.isPending}
                  />
                </div>
              </FieldRow>

              <FieldRow label={t`Week starts on`}>
                <div className="w-full">
                  <ComboSelect
                    value={data.preferences.week_start || 'auto'}
                    options={{
                      ...weekStartLabels,
                      auto: `${weekStartLabels.auto}: ${weekStartLabels[(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][detectWeekStart()]) ?? 'monday'] ?? ''}`,
                    }}
                    onChange={(value) => handleChange('week_start', value)}
                    disabled={setPreference.isPending}
                  />
                </div>
              </FieldRow>

              <FieldRow label={t`Timestamps`}>
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
