// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import type { ColorTheme, ThemeInfo } from '@mochi/web'

export type ThemeOverridePrefs = {
  density: string
  radius: string
  card: string
  background: string
  font: string
  font_size: string
}

export const FONT_SIZE_PCT: Record<string, string> = {
  small: '87.5%',
  normal: '100%',
  large: '112.5%',
  'extra-large': '125%',
}

// Mirror of font_stacks() in core/server/themes.go. Empty string means
// "no override" — the density preset (or theme's font_sans/font_mono)
// keeps its value.
export const FONT_STACKS: Record<string, { sans: string; mono?: string }> = {
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

export function prefsFromData(prefs: Record<string, string>): ThemeOverridePrefs {
  return {
    density: prefs.density || 'theme',
    radius: prefs.radius || 'theme',
    card: prefs.card || 'theme',
    background: prefs.background || 'theme',
    font: prefs.font || 'theme',
    font_size: prefs.font_size || 'theme',
  }
}

export function colorThemeFromSelections(
  themes: ThemeInfo[] | undefined,
  selectedThemeId: string | undefined,
  prefs: ThemeOverridePrefs,
  presets: Record<string, Record<string, string>> | undefined,
): ColorTheme | null {
  const theme = themes?.find((t) => t.id === selectedThemeId)

  const effectiveDensity =
    prefs.density !== 'theme' ? prefs.density : (theme?.spacing ?? '')
  const effectiveRadius =
    prefs.radius !== 'theme' ? prefs.radius : theme?.border_radius
  const showBackground = prefs.background !== 'off'

  const styleOverrides = effectiveDensity ? presets?.[effectiveDensity] : null

  const overrides: Record<string, string> = { ...(theme?.overrides ?? {}) }
  if (theme?.background_url && showBackground) {
    overrides['--background-image'] = `url(${theme.background_url})`
  }
  if (effectiveRadius) {
    overrides['--radius'] = effectiveRadius
  }
  // Card surface treatment: user override wins over the theme's value. Each
  // non-theme option sets both axes (border + shadow) explicitly so it fully
  // overrides whatever the theme specifies.
  const CARD_STYLES: Record<string, { border: string; shadow: string }> = {
    flat: { border: 'var(--border-width)', shadow: 'none' },
    raised: { border: 'var(--border-width)', shadow: 'var(--shadow-sm)' },
  }
  const cardStyle = CARD_STYLES[prefs.card]
  if (cardStyle) {
    overrides['--card-border-width'] = cardStyle.border
    overrides['--card-shadow'] = cardStyle.shadow
  }
  if (styleOverrides) Object.assign(overrides, styleOverrides)
  if (theme?.font_sans) overrides['--font-sans'] = theme.font_sans
  if (theme?.font_mono) overrides['--font-mono'] = theme.font_mono
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
