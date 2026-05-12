import { useEffect } from 'react'
import {
  useTheme,
  usePreferencesData as usePreferencesDataCommon,
  useSetPreference as useSetPreferenceCommon,
  useResetPreferences as useResetPreferencesCommon,
} from '@mochi/web'
import endpoints from '@/api/endpoints'
import { colorThemeFromSelections, prefsFromData } from '@/lib/color-theme'

export function usePreferencesData() {
  return usePreferencesDataCommon(endpoints.user.preferences)
}

export function useSetPreference() {
  return useSetPreferenceCommon(endpoints.user.preferencesSet)
}

export function useResetPreferences() {
  return useResetPreferencesCommon(endpoints.user.preferencesReset)
}

// useApplyDisplayPreferences resolves the user's preferences into a full
// ColorTheme and pushes it through ThemeProvider on mount. Called once from
// the authenticated layout so every settings page renders with the correct
// density / radius / font / font-size / background, not only the Display
// page where the user happens to view their selections.
export function useApplyDisplayPreferences() {
  const { data } = usePreferencesData()
  const { setTheme, setColorTheme } = useTheme()

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
}
