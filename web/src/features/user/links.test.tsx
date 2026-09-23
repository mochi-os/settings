// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserLinks } from './links'

const mutate = vi.fn()
const preferences: Record<string, string> = {}

vi.mock('@/hooks/use-preferences', () => ({
  usePreferencesData: () => ({
    data: { preferences, themes: [], presets: [] },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useSetPreference: () => ({ mutate, isPending: false }),
}))

function show() {
  render(
    <I18nProvider i18n={i18n}>
      <UserLinks />
    </I18nProvider>
  )
}

describe('UserLinks', () => {
  beforeEach(() => {
    mutate.mockReset()
    for (const key of Object.keys(preferences)) delete preferences[key]
  })

  it('shows the defaults when nothing is set: OpenStreetMap and Flightradar24', () => {
    show()
    const boxes = screen.getAllByRole('combobox')
    expect(boxes.map((box) => box.textContent)).toEqual([
      'OpenStreetMap',
      'Flightradar24',
    ])
  })

  it('shows the stored services', () => {
    preferences.maps = 'google'
    preferences.flights = 'flightaware'
    show()
    const boxes = screen.getAllByRole('combobox')
    expect(boxes.map((box) => box.textContent)).toEqual([
      'Google Maps',
      'FlightAware',
    ])
  })

  it('falls back to the default for a value it does not know', () => {
    preferences.maps = 'apple'
    show()
    expect(screen.getAllByRole('combobox')[0].textContent).toBe('OpenStreetMap')
  })

  it('writes the chosen map service as the maps preference', async () => {
    show()
    fireEvent.click(screen.getAllByRole('combobox')[0])
    const option = await screen.findByRole('option', { name: 'Google Maps' })
    fireEvent.click(option)
    await waitFor(() => expect(mutate).toHaveBeenCalled())
    expect(mutate.mock.calls[0][0]).toEqual({ maps: 'google' })
  })

  it('writes the chosen tracker as the flights preference', async () => {
    show()
    fireEvent.click(screen.getAllByRole('combobox')[1])
    const option = await screen.findByRole('option', { name: 'FlightAware' })
    fireEvent.click(option)
    await waitFor(() => expect(mutate).toHaveBeenCalled())
    expect(mutate.mock.calls[0][0]).toEqual({ flights: 'flightaware' })
  })
})
