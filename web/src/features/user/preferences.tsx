import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  Loader2,
  RotateCcw,
  Sliders,
  Check,
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
  stylePresetLabels,
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
  shellSetLanguage,
  useLocale,
  detectDateFormat,
  detectTimeFormat,
  detectWeekStart,
  detectNumberFormat,
  detectUnits,
  type LocalePreferences,
} from '@mochi/web'
type RadiusOverrides = Record<string, string>
type StyleOverrides = Record<string, string>

const radiusPresetOverrides: Record<string, RadiusOverrides> = {
  none:   { '--radius': '0rem' },
  small:  { '--radius': '0.375rem' },
  medium: { '--radius': '0.75rem' },
  large:  { '--radius': '1.75rem' },
}

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

const stylePresetSelectLabels: Record<string, string> = {
  vega: stylePresetLabels.vega,
  nova: stylePresetLabels.nova,
  maia: stylePresetLabels.maia,
  lyra: stylePresetLabels.lyra,
  mira: stylePresetLabels.mira,
  luma: stylePresetLabels.default,
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

function normalizeStylePresetForSelect(
  value: string
): 'vega' | 'nova' | 'maia' | 'lyra' | 'mira' | 'luma' {
  const preset = normalizeStylePreset(value)
  return preset === 'default' ? 'luma' : preset
}

function radiusOverridesFromThemeBase(baseRadius: string): RadiusOverrides {
  return {
    '--radius': baseRadius,
  }
}

function radiusOverridesFromPreference(value: string): RadiusOverrides | null {
  if (!value || value === 'default') return null
  return radiusPresetOverrides[value] ?? null
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
  stylePreset: string | undefined,
  borderRadius: string | undefined
): ColorThemeState | null {
  const styleOverrides = stylePresetOverridesFromPreference(stylePreset || 'luma')
  const radiusOverrides = radiusOverridesFromPreference(borderRadius || 'default')
  const theme = themes?.find((t) => t.id === selectedThemeId)

  if (!theme) {
    const overrides: Record<string, string> = {}
    if (styleOverrides) Object.assign(overrides, styleOverrides)
    if (radiusOverrides) Object.assign(overrides, radiusOverrides)
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
  if (radiusOverrides) Object.assign(overrides, radiusOverrides)

  return {
    hue: String(theme.hue),
    chroma: String(theme.chroma),
    hueBg: String(theme.hue_bg),
    overrides,
  }
}

const radiusRx: Record<string, number> = { none: 0, small: 2.25, medium: 4.25, large: 6.5 }

function parseRadiusToRem(value: string | undefined): number | null {
  if (!value) return null

  const trimmed = value.trim()
  if (!trimmed) return null

  if (trimmed.endsWith('rem')) {
    const parsed = Number.parseFloat(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }

  if (trimmed.endsWith('px')) {
    const parsed = Number.parseFloat(trimmed)
    return Number.isFinite(parsed) ? parsed / 16 : null
  }

  const parsed = Number.parseFloat(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function radiusRemToIconRx(radiusRem: number): number {
  const normalized = Math.max(0, Math.min(radiusRem / 1.6, 1))
  return Number((normalized * 6.5).toFixed(2))
}

function resolveFollowThemeRadius(
  themes: ThemeInfo[] | undefined,
  selectedThemeId: string | undefined
): string | undefined {
  return themes?.find((theme) => theme.id === selectedThemeId)?.border_radius
}

function RadiusIcon({
  value,
  themes,
  selectedThemeId,
}: {
  value: string
  themes?: ThemeInfo[]
  selectedThemeId?: string
}) {
  const rx = value === 'default'
    ? radiusRemToIconRx(
        parseRadiusToRem(resolveFollowThemeRadius(themes, selectedThemeId)) ?? 0.625
      )
    : (radiusRx[value] ?? 4.25)

  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-foreground" aria-hidden>
      <rect x="1.5" y="1.5" width="13" height="13" rx={rx} stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
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

function RadiusLabel({
  value,
  label,
  themes,
  selectedThemeId,
}: {
  value: string
  label: string
  themes?: ThemeInfo[]
  selectedThemeId?: string
}) {
  return (
    <span className='flex min-w-0 items-center gap-2'>
      <RadiusIcon
        value={value}
        themes={themes}
        selectedThemeId={selectedThemeId}
      />
      <span className='truncate'>{label}</span>
    </span>
  )
}

function PresetStrokeIcon({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={cn('size-4 shrink-0 text-muted-foreground', className)}
      aria-hidden
    >
      {children}
    </svg>
  )
}

function StylePresetIcon({ value }: { value: string }) {
  const preset = normalizeStylePreset(value)
  switch (preset) {
    case 'default':
    case 'maia':
      return (
        <PresetStrokeIcon>
          <circle cx='8' cy='8' r='5.75' stroke='currentColor' strokeWidth='1.5' />
        </PresetStrokeIcon>
      )
    case 'vega':
      return (
        <PresetStrokeIcon>
          <rect x='2.5' y='2.5' width='11' height='11' rx='1.75' stroke='currentColor' strokeWidth='1.5' />
        </PresetStrokeIcon>
      )
    case 'nova':
      return (
        <PresetStrokeIcon>
          <rect x='2.25' y='4.25' width='11.5' height='7.5' rx='2.5' stroke='currentColor' strokeWidth='1.5' />
        </PresetStrokeIcon>
      )
    case 'luma':
      return (
        <PresetStrokeIcon>
          <rect x='2.25' y='4.25' width='11.5' height='7.5' rx='3.75' stroke='currentColor' strokeWidth='1.5' />
        </PresetStrokeIcon>
      )
    case 'lyra':
      return (
        <PresetStrokeIcon>
          <path
            d='M8 1.75 13.1 4.7v6.6L8 14.25 2.9 11.3V4.7L8 1.75Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinejoin='round'
          />
        </PresetStrokeIcon>
      )
    case 'mira':
      return (
        <PresetStrokeIcon>
          <path
            d='M8 1.75 13 8 8 14.25 3 8 8 1.75Z'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinejoin='round'
          />
        </PresetStrokeIcon>
      )
    default:
      return (
        <PresetStrokeIcon>
          <circle cx='8' cy='8' r='5.75' stroke='currentColor' strokeWidth='1.5' />
        </PresetStrokeIcon>
      )
  }
}

function StylePresetLabel({
  value,
  label,
}: {
  value: string
  label: string
}) {
  return (
    <span className='flex min-w-0 items-center gap-2'>
      <StylePresetIcon value={value} />
      <span className='truncate'>{label}</span>
    </span>
  )
}

import { ComboSelect } from '@/components/combo-select'
import {
  usePreferencesData,
  useSetPreference,
  useResetPreferences,
} from '@/hooks/use-preferences'

export function UserPreferences() {
  const { t } = useLingui()
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
  // Phase 2 ships fr/ja/en-US catalogs the picker reveals itself.
  const { data: languagesData } = useQuery<{ languages: string[] }>({
    queryKey: ['_', 'languages'],
    queryFn: () => fetch('/_/languages').then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  })
  const languageOptions = useMemo(() => {
    const tags = languagesData?.languages ?? ['en']
    const out: Record<string, string> = {}
    for (const tag of tags) {
      let nativeName = tag
      try {
        nativeName = new Intl.DisplayNames([tag], { type: 'language' }).of(tag) ?? tag
      } catch {
        /* fall back to raw tag */
      }
      out[tag] = nativeName
    }
    return out
  }, [languagesData])
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
        data.preferences.style_preset,
        data.preferences.border_radius
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
            // Lingui catalog without a page reload.
            shellSetLanguage(value)
          }
          if ((key === 'border_radius' || key === 'style_preset') && data) {
            const nextStylePreset = key === 'style_preset' ? value : data.preferences.style_preset
            const nextBorderRadius = key === 'border_radius' ? value : data.preferences.border_radius
            setColorTheme(
              colorThemeFromSelections(
                data.themes,
                data.preferences.theme,
                nextStylePreset,
                nextBorderRadius
              )
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
              data?.preferences.style_preset,
              data?.preferences.border_radius
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
        title={"Preferences"}
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

        <Section title={"Display"}>
          <div className='divide-y-0'>
            {error ? (
              <GeneralError error={error} minimal mode='inline' reset={refetch} />
            ) : isLoading ? (
              <ListSkeleton variant='simple' height='h-12' count={2} />
            ) : data ? (
              <>
                <FieldRow label={"Appearance"}>
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
                  <FieldRow label={"Theme"}>
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
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </Button>
                  </FieldRow>
                )}
                <FieldRow label={"Border radius"}>
                  <div className="w-full">
                    <ComboSelect
                      value={data.preferences.border_radius || 'default'}
                      options={{ default: "Follow theme", none: "None", small: "Small", medium: "Medium", large: "Large" }}
                      onChange={(value) => handleChange('border_radius', value)}
                      disabled={setPreference.isPending}
                      renderOption={(optValue, label) => (
                        <RadiusLabel
                          value={optValue}
                          label={label}
                          themes={data.themes}
                          selectedThemeId={data.preferences.theme}
                        />
                      )}
                      renderValue={(optValue, label) => (
                        <RadiusLabel
                          value={optValue}
                          label={label}
                          themes={data.themes}
                          selectedThemeId={data.preferences.theme}
                        />
                      )}
                    />
                  </div>
                </FieldRow>
                <FieldRow label={"Style preset"}>
                  <div className="w-full">
                    <ComboSelect
                      value={normalizeStylePresetForSelect(data.preferences.style_preset || 'luma')}
                      options={stylePresetSelectLabels}
                      onChange={(value) => handleChange('style_preset', value)}
                      disabled={setPreference.isPending}
                      renderOption={(optValue, label) => (
                        <StylePresetLabel value={optValue} label={label} />
                      )}
                      renderValue={(optValue, label) => (
                        <StylePresetLabel value={optValue} label={label} />
                      )}
                    />
                  </div>
                </FieldRow>

                <Sheet open={themeSheetOpen} onOpenChange={setThemeSheetOpen}>
                  <SheetContent className="overflow-y-auto" onInteractOutside={() => {}}>
                    <SheetHeader>
                      <SheetTitle><Trans>Theme</Trans></SheetTitle>
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
                              'flex items-center gap-3 rounded-md border-[length:var(--border-width)] p-3 text-left transition-colors',
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            <span
                              className="size-8 rounded-sm shrink-0"
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

        {data && !error && showLanguagePicker && (
          <Section title={"Language"}>
            <div className='divide-y-0'>
              <FieldRow label={"Language"}>
                <div className="w-full">
                  <ComboSelect
                    value={data.preferences.language || 'en'}
                    options={languageOptions}
                    onChange={(value) => handleChange('language', value)}
                    disabled={setPreference.isPending}
                  />
                </div>
              </FieldRow>
            </div>
          </Section>
        )}

        {data && !error && (
          <Section title={"Regional"}>
            <div className='divide-y-0'>
              <FieldRow label={"Time zone"}>
                <div className="w-full">
                  <TimezoneSelect
                    value={data.preferences.timezone}
                    onChange={(value) => handleChange('timezone', value)}
                    disabled={setPreference.isPending}
                  />
                </div>
              </FieldRow>

              <FieldRow label={"Units"}>
                <div className="w-full">
                  <ComboSelect
                    value={data.preferences.units || 'auto'}
                    options={{ ...unitLabels, auto: `${unitLabels.auto} (${unitLabels[detectUnits()] || detectUnits()})` }}
                    onChange={(value) => handleChange('units', value)}
                    disabled={setPreference.isPending}
                  />
                </div>
              </FieldRow>

              <FieldRow label={"Number format"}>
                <div className="w-full">
                  <ComboSelect
                    value={data.preferences.number_format || 'auto'}
                    options={{ ...numberFormatLabels, auto: `${numberFormatLabels.auto} (${detectNumberFormat()})` }}
                    onChange={(value) => handleChange('number_format', value)}
                    disabled={setPreference.isPending}
                  />
                </div>
              </FieldRow>

              <FieldRow label={"Date format"}>
                <div className="w-full">
                  <ComboSelect
                    value={data.preferences.date_format || 'auto'}
                    options={{ ...dateFormatLabels, auto: `${dateFormatLabels.auto} (${detectDateFormat()})` }}
                    onChange={(value) => handleChange('date_format', value)}
                    disabled={setPreference.isPending}
                  />
                </div>
              </FieldRow>

              <FieldRow label={"Time format"}>
                <div className="w-full">
                  <ComboSelect
                    value={data.preferences.time_format || 'auto'}
                    options={{ ...timeFormatLabels, auto: `${timeFormatLabels.auto} (${detectTimeFormat() === '12h' ? '12 hours' : '24 hours'})` }}
                    onChange={(value) => handleChange('time_format', value)}
                    disabled={setPreference.isPending}
                  />
                </div>
              </FieldRow>

              <FieldRow label={"Week starts on"}>
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

              <FieldRow label={"Timestamps"}>
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
