// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useApplyDisplayPreferences } from '@/hooks/use-preferences'
import { UserDisplay } from './display'

const state = vi.hoisted(() => ({
  // The theme the user chose; "" when they follow the server's default.
  theme: '',
  set: vi.fn(),
  unset: vi.fn(),
  colour: vi.fn(),
}))

const theme = (id: string, label: string, hue: number) => ({
  id,
  app: 'app1',
  label,
  hue,
  chroma: 0.1,
  hue_bg: hue,
})

vi.mock('@mochi/web', async (original) => ({
  ...(await original<typeof import('@mochi/web')>()),
  useTheme: () => ({ setTheme: vi.fn(), setColorTheme: state.colour }),
  usePreferencesData: () => ({
    data: {
      preferences: {
        appearance: 'auto',
        theme: state.theme,
        density: 'theme',
        radius: 'theme',
        card: 'theme',
        background: 'theme',
        font: 'theme',
        font_size: 'theme',
      },
      themes: [theme('app1:blue', 'Blue', 250), theme('app1:amber', 'Amber', 70)],
      presets: {},
      default_theme: 'app1:blue',
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useSetPreference: () => ({ mutate: state.set, isPending: false }),
  useUnsetPreferences: () => ({ mutate: state.unset, isPending: false }),
}))

function show() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider i18n={i18n}>
        <UserDisplay />
      </I18nProvider>
    </QueryClientProvider>
  )
}

// The sheet's card for a theme.
function card(label: string) {
  return within(screen.getByRole('dialog')).getByRole('button', {
    name: label,
  })
}

// The Theme row names the theme in use, or Default when there is none.
function openThemes(current: string) {
  fireEvent.click(screen.getByRole('button', { name: current }))
}

const selected = (button: HTMLElement) =>
  button.querySelector('svg.lucide-check') !== null

describe('Display theme', () => {
  beforeEach(() => {
    state.set.mockReset()
    state.unset.mockReset()
    state.colour.mockReset()
  })

  it('shows the server default as the default, not as a choice', () => {
    state.theme = ''
    show()
    openThemes('Default')
    expect(selected(card('Blue'))).toBe(false)
  })

  it('choosing the default theme makes it the user\'s own choice', () => {
    state.theme = ''
    show()
    openThemes('Default')
    fireEvent.click(card('Blue'))
    expect(state.set).toHaveBeenCalledWith(
      { theme: 'app1:blue' },
      expect.anything()
    )
    expect(state.unset).not.toHaveBeenCalled()
  })

  it('deselecting a chosen theme clears the choice and applies the default', () => {
    state.theme = 'app1:amber'
    state.unset.mockImplementation(
      (_keys: string[], options: { onSuccess: () => void }) => options.onSuccess()
    )
    show()
    openThemes('Amber')
    expect(selected(card('Amber'))).toBe(true)
    fireEvent.click(card('Amber'))
    expect(state.unset).toHaveBeenCalledWith(['theme'], expect.anything())
    expect(state.set).not.toHaveBeenCalled()
    // The server's default takes over at once, not a bare theme.
    expect(JSON.stringify(state.colour.mock.lastCall?.[0])).toContain('250')
  })

  it('applies the server default when the user chose no theme', () => {
    state.theme = ''
    function Apply() {
      useApplyDisplayPreferences()
      return null
    }
    render(<Apply />)
    expect(JSON.stringify(state.colour.mock.lastCall?.[0])).toContain('250')
  })
})
