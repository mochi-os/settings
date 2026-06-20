// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  Loader2,
  RotateCcw,
  Sliders,
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
  TimezoneSelect,
  getErrorMessage,
  useDateFormatLabels,
  useTimeFormatLabels,
  useTimestampDisplayLabels,
  useWeekStartLabels,
  useNumberFormatLabels,
  useUnitLabels,
  toast,
  usePageTitle,
  shellSetLocale,
  shellSetLanguage,
  setStoredLanguage,
  useLocale,
  detectDateFormat,
  detectTimeFormat,
  detectWeekStart,
  detectNumberFormat,
  detectUnits,
  detectLanguage,
  type LocalePreferences,
} from '@mochi/web'

import { ComboSelect } from '@/components/combo-select'
import {
  usePreferencesData,
  useSetPreference,
  useResetPreferences,
} from '@/hooks/use-preferences'

const REGIONAL_PREF_KEYS = ['language', 'timezone', 'date_format', 'time_format', 'timestamp_display', 'week_start', 'number_format', 'units'] as const

export function UserPreferences() {
  const { t, i18n } = useLingui()
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
  const { raw: currentLocale } = useLocale()

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
    /* eslint-disable lingui/no-unlocalized-strings -- language names display in their native form for self-identification */
    const overrides: Record<string, string> = {
      'en': 'English (international)',
      'en-us': 'English (USA)',
      'es': 'Español (España)',
      'es-419': 'Español (latinoamericano)',
    }
    /* eslint-enable lingui/no-unlocalized-strings */
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

  const handleChange = (key: string, value: string) => {
    setPreference.mutate(
      { [key]: value },
      {
        onSuccess: () => {
          if ((localeKeys as readonly string[]).includes(key) || key === 'timezone') {
            const updated = { ...currentLocale, [key]: value } as LocalePreferences
            shellSetLocale(updated)
          }
          if (key === 'language') {
            setStoredLanguage(value)
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

  const handleReset = () => {
    if (!data) return
    // Reset only the regional keys, leaving display prefs alone.
    const resetPayload: Record<string, string> = {}
    for (const key of REGIONAL_PREF_KEYS) {
      resetPayload[key] = ''
    }
    setPreference.mutate(resetPayload, {
      onSuccess: () => {
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
                disabled={isLoading || resetPreferences.isPending || setPreference.isPending}
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

      <Main className="space-y-6">
        {error ? (
          <GeneralError error={error} minimal mode='inline' reset={refetch} />
        ) : isLoading ? (
          <ListSkeleton variant='simple' height='h-12' count={6} />
        ) : data ? (
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
        ) : null}
      </Main>
    </>
  )
}
