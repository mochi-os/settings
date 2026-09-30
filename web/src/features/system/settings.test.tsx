// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SystemSettings } from './settings'

const state = vi.hoisted(() => ({
  request: vi.fn(),
  save: vi.fn(),
  error: vi.fn(),
}))

const setting = (name: string, value: string, extra = {}) => ({
  name,
  value,
  default: value,
  description: '',
  pattern: 'line',
  user_readable: false,
  read_only: false,
  public: false,
  ...extra,
})

vi.mock('@mochi/web', async (original) => ({
  ...(await original<typeof import('@mochi/web')>()),
  toast: { success: vi.fn(), error: state.error },
}))

vi.mock('@/hooks/use-system-settings', () => ({
  useSystemSettingsData: () => ({
    data: {
      settings: [
        setting('default_theme', 'app1:blue', { default: 'app1:blue' }),
        setting('auth_passkey', 'allowed', {
          pattern: '^(disabled|allowed|required)$',
        }),
        setting('fcm.service_account', '', { pattern: 'text' }),
      ],
      themes: [
        { id: 'app1:blue', app: 'app1', label: 'Blue', hue: 0, chroma: 0, hue_bg: 0 },
        { id: 'app1:amber', app: 'app1', label: 'Amber', hue: 0, chroma: 0, hue_bg: 0 },
      ],
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useSetSystemSetting: () => ({ mutateAsync: state.save, isPending: false }),
}))

vi.mock('@/lib/use-step-up', () => ({
  useStepUp: () => ({ request: state.request, dialog: null }),
}))

function show() {
  render(
    <I18nProvider i18n={i18n}>
      <SystemSettings />
    </I18nProvider>
  )
}

describe('System settings', () => {
  beforeEach(() => {
    state.request.mockReset()
    state.save.mockReset().mockResolvedValue(undefined)
    state.error.mockReset()
  })

  it('offers the default theme by label, never its entity:theme id', () => {
    show()
    const picker = screen.getByRole('combobox')
    expect(picker).toHaveTextContent('Blue')
    expect(document.body.textContent).not.toContain('app1:blue')
    fireEvent.click(picker)
    fireEvent.click(screen.getByRole('option', { name: 'Amber' }))
    // The save goes through the step-up and sends the theme's id.
    const run = state.request.mock.calls[0][0] as (token: string) => void
    run('proof')
    expect(state.save).toHaveBeenCalledWith({
      name: 'default_theme',
      value: 'app1:amber',
      token: 'proof',
    })
  })

  it('reports a file that cannot be read', async () => {
    show()
    const input = document.querySelector(
      'input[type=file]'
    ) as HTMLInputElement
    const unreadable = {
      name: 'key.json',
      text: () => Promise.reject(new Error('unreadable')),
    }
    await act(async () => {
      fireEvent.change(input, { target: { files: [unreadable] } })
    })
    await waitFor(() => expect(state.error).toHaveBeenCalledTimes(1))
    expect(state.request).not.toHaveBeenCalled()
  })

  it('picks a login method state from the segmented control', () => {
    show()
    const allowed = screen.getByRole('button', { name: 'Allowed' })
    expect(allowed).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Required' }))
    const run = state.request.mock.calls[0][0] as (token: string) => void
    run('proof')
    expect(state.save).toHaveBeenCalledWith({
      name: 'auth_passkey',
      value: 'required',
      token: 'proof',
    })
  })
})
