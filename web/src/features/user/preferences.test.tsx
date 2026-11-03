// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { toast } from '@mochi/web'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UserPreferences } from './preferences'

const state = vi.hoisted(() => ({
  set: vi.fn(),
  unset: vi.fn(),
  setLanguage: vi.fn(),
  storeLanguage: vi.fn(),
  setLocale: vi.fn(),
}))

vi.mock('@mochi/web', async (original) => ({
  ...(await original<typeof import('@mochi/web')>()),
  shellSetLanguage: state.setLanguage,
  setStoredLanguage: state.storeLanguage,
  shellSetLocale: state.setLocale,
}))

vi.mock('@/hooks/use-preferences', () => ({
  usePreferencesData: () => ({
    data: {
      preferences: { language: 'auto', timezone: 'auto' },
      themes: [],
      presets: {},
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useSetPreference: () => ({ mutateAsync: state.set, isPending: false }),
  useUnsetPreferences: () => ({ mutate: state.unset, isPending: false }),
}))

// The language row only shows once the installed languages have loaded.
async function show() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider i18n={i18n}>
        <UserPreferences />
      </I18nProvider>
    </QueryClientProvider>
  )
  await screen.findByText('Language')
}

async function pickLanguage(name: RegExp) {
  fireEvent.click(screen.getAllByRole('combobox')[0])
  fireEvent.click(await screen.findByRole('option', { name }))
}

// The language is applied to every open app when its save answers. Saves can
// be answered in any order, and only the newest pick answered so far may
// apply, so the last pick always wins.
describe('UserPreferences language', () => {
  beforeEach(() => {
    for (const mock of Object.values(state)) mock.mockReset()
    state.set.mockResolvedValue(undefined)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ languages: ['en', 'fr', 'de', 'es'] }),
      }))
    )
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('ends on the last of three picks answered second, third, first', async () => {
    const success = vi.spyOn(toast, 'success')
    const lands: (() => void)[] = []
    for (let i = 0; i < 3; i++) {
      state.set.mockImplementationOnce(
        () => new Promise<void>((resolve) => lands.push(resolve))
      )
    }
    await show()
    await pickLanguage(/Français/)
    await pickLanguage(/Deutsch/)
    await pickLanguage(/Español/)
    await waitFor(() => expect(lands).toHaveLength(3))
    expect(state.set.mock.calls.map(([body]) => body)).toEqual([
      { language: 'fr' },
      { language: 'de' },
      { language: 'es' },
    ])

    lands[1]()
    await waitFor(() => expect(success).toHaveBeenCalledTimes(1))
    lands[2]()
    await waitFor(() => expect(success).toHaveBeenCalledTimes(2))
    lands[0]()
    await waitFor(() => expect(success).toHaveBeenCalledTimes(3))

    expect(state.setLanguage.mock.calls).toEqual([['de'], ['es']])
    expect(state.storeLanguage.mock.lastCall).toEqual(['es'])
  })

  it('still says so when a pick is refused', async () => {
    const error = vi.spyOn(toast, 'error')
    state.set.mockRejectedValue({ response: { status: 500 } })
    await show()
    await pickLanguage(/Français/)
    await waitFor(() =>
      expect(error).toHaveBeenCalledWith('Failed to update preference')
    )
    expect(state.setLanguage).not.toHaveBeenCalled()
  })

  // Reset sets the language back to the browser's. A language pick made
  // before it, whose answer arrives after it, must not undo it.
  it('keeps a reset when an older language pick is answered after it', async () => {
    let landPick = () => {}
    state.set.mockImplementationOnce(
      () => new Promise<void>((resolve) => (landPick = resolve))
    )
    state.unset.mockImplementation(
      (_keys: string[], options: { onSuccess: () => void }) =>
        options.onSuccess()
    )
    await show()
    await pickLanguage(/Français/)
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Reset to defaults' })[0]
    )
    // The confirm dialog's portal is outside the tree jsdom treats as
    // accessible, so its buttons are found with hidden included.
    const [confirm] = await screen.findAllByRole('button', {
      name: 'Reset',
      hidden: true,
    })
    fireEvent.click(confirm)
    await waitFor(() => expect(state.storeLanguage).toHaveBeenCalledTimes(1))
    expect(state.storeLanguage).toHaveBeenLastCalledWith('auto')

    const success = vi.spyOn(toast, 'success')
    success.mockClear()
    landPick()
    await waitFor(() =>
      expect(success).toHaveBeenCalledWith('Preference updated')
    )
    expect(state.storeLanguage).toHaveBeenCalledTimes(1)
    expect(state.setLanguage).toHaveBeenCalledTimes(1)
    expect(state.setLanguage).not.toHaveBeenCalledWith('fr')
  })
})
