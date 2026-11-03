// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { toast } from '@mochi/web'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import endpoints from '@/api/endpoints'
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
    data: preferencesData(),
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useSetPreference: () => ({ mutateAsync: state.set, isPending: false }),
  useUnsetPreferences: () => ({ mutate: state.unset, isPending: false }),
}))

// What the server holds. The page reads it through the hook above, and the
// save's follow-up reads it from the query cache, so show() puts it in both.
function preferencesData() {
  return {
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
  }
}

function show() {
  const queryClient = new QueryClient()
  queryClient.setQueryData(
    ['user', 'preferences', endpoints.user.preferences],
    preferencesData()
  )
  render(
    <QueryClientProvider client={queryClient}>
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
    state.set.mockReset().mockResolvedValue(undefined)
    state.unset.mockReset()
    state.colour.mockReset()
  })

  it('shows the server default as the default, not as a choice', () => {
    state.theme = ''
    show()
    openThemes('Default')
    expect(selected(card('Blue'))).toBe(false)
  })

  it("choosing the default theme makes it the user's own choice", () => {
    state.theme = ''
    show()
    openThemes('Default')
    fireEvent.click(card('Blue'))
    expect(state.set).toHaveBeenCalledWith({ theme: 'app1:blue' })
    expect(state.unset).not.toHaveBeenCalled()
  })

  // The shell re-reads its own theme from the server each time the page
  // applies one, so every save that lands applies the preferences again,
  // once the server has them. What is applied is the preferences as they
  // are then, not the pick, so the order the answers come in does not
  // matter. Both answers still confirm.
  it('applies the preferences again as each save lands', async () => {
    const success = vi.spyOn(toast, 'success')
    success.mockClear()
    state.theme = ''
    let landFirst = () => {}
    state.set.mockImplementationOnce(
      () => new Promise<void>((resolve) => (landFirst = resolve))
    )
    show()
    openThemes('Default')
    fireEvent.click(card('Amber'))
    fireEvent.click(card('Blue'))
    await waitFor(() => expect(success).toHaveBeenCalledTimes(1))
    expect(state.colour).toHaveBeenCalledTimes(1)
    landFirst()
    await waitFor(() => expect(success).toHaveBeenCalledTimes(2))
    expect(success).toHaveBeenCalledWith('Theme updated')
    expect(state.colour).toHaveBeenCalledTimes(2)
    // The preferences say no theme was chosen, so the server default shows.
    expect(JSON.stringify(state.colour.mock.lastCall?.[0])).toContain('250')
  })

  it('deselecting a chosen theme clears the choice and applies the default', () => {
    state.theme = 'app1:amber'
    state.unset.mockImplementation(
      (_keys: string[], options: { onSuccess: () => void }) =>
        options.onSuccess()
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
