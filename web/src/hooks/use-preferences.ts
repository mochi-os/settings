// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useTheme,
  usePreferencesData as usePreferencesDataCommon,
  useSetPreference as useSetPreferenceCommon,
  useUnsetPreferences as useUnsetPreferencesCommon,
} from '@mochi/web'
import endpoints from '@/api/endpoints'
import { colorThemeFromSelections, prefsFromData } from '@/lib/color-theme'

// The key lib/web's usePreferencesData reads this endpoint under.
const PREFERENCES_KEY = ['user', 'preferences', endpoints.user.preferences]

export function usePreferencesData() {
  return usePreferencesDataCommon(endpoints.user.preferences)
}

export function useSetPreference() {
  return useSetPreferenceCommon(endpoints.user.preferencesSet)
}

export function useUnsetPreferences() {
  return useUnsetPreferencesCommon(endpoints.user.preferencesUnset)
}

type Preferences = NonNullable<ReturnType<typeof usePreferencesData>['data']>
type Theme = ReturnType<typeof useTheme>

function applyDisplay(
  data: Preferences,
  { setTheme, setColorTheme }: Pick<Theme, 'setTheme' | 'setColorTheme'>
) {
  const appearance = data.preferences.appearance
  if (appearance === 'light' || appearance === 'dark') {
    setTheme(appearance)
  } else {
    setTheme('system')
  }
  setColorTheme(
    colorThemeFromSelections(
      data.themes,
      data.preferences.theme || data.default_theme,
      prefsFromData(data.preferences),
      data.presets
    )
  )
}

// Resolve the user's preferences into a ColorTheme and push it through
// ThemeProvider on mount; called once from the authenticated layout so every
// settings page renders with the user's density, radius, font and background.
export function useApplyDisplayPreferences() {
  const { data } = usePreferencesData()
  const { setTheme, setColorTheme } = useTheme()

  useEffect(() => {
    if (data) applyDisplay(data, { setTheme, setColorTheme })
  }, [data, setColorTheme, setTheme])
}

// For a display pick whose save has just answered: applies what the
// preferences hold now. The layout already applied the pick on the click,
// but the shell re-reads its own theme from the server on each
// color-theme-set, and that first message can reach it before the server has
// the pick. Applying the preferences as they are now, rather than as they
// were when the pick was made, keeps the last pick on screen whatever order
// the answers come back in.
export function useReapplyDisplayPreferences() {
  const queryClient = useQueryClient()
  const { setTheme, setColorTheme } = useTheme()

  // Read from the cache when called, not from a render: a rollback written
  // a moment ago, or after the page has gone, is already there.
  return useCallback(() => {
    const data = queryClient.getQueryData<Preferences>(PREFERENCES_KEY)
    if (data) applyDisplay(data, { setTheme, setColorTheme })
  }, [queryClient, setTheme, setColorTheme])
}
