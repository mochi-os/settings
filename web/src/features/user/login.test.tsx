// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserLogin } from './login'

const state = vi.hoisted(() => ({
  rename: vi.fn(),
  finish: vi.fn(),
  request: vi.fn(),
}))

vi.mock('@mochi/web', async (original) => ({
  ...(await original<typeof import('@mochi/web')>()),
  shellWebauthnCreate: vi.fn().mockResolvedValue({ id: 'credential' }),
}))

const idle = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }
const loaded = (data: unknown) => ({
  data,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
})

vi.mock('@/hooks/use-account', () => ({
  useAuthMethods: () => loaded({}),
  useMethods: () => loaded({ methods: {} }),
  useOauthLink: () => idle,
  useOauthIdentities: () => loaded({ identities: [] }),
  useOauthUnlink: () => idle,
  usePasskeyDelete: () => idle,
  usePasskeyRegisterBegin: () => ({
    ...idle,
    mutateAsync: vi.fn().mockResolvedValue({ ceremony: 'c', options: {} }),
  }),
  usePasskeyRegisterFinish: () => ({ ...idle, mutateAsync: state.finish }),
  usePasskeyRename: () => ({ ...idle, mutate: state.rename }),
  usePasskeys: () =>
    loaded({
      passkeys: [{ id: 'p1', name: 'Laptop', created: 1, last_used: 0 }],
    }),
  useRecoveryGenerate: () => ({ run: vi.fn(), isPending: false }),
  useRecoveryStatus: () => loaded({ count: 0 }),
  useSetMethod: () => idle,
  useTotpDisable: () => idle,
  useTotpSetup: () => ({ run: vi.fn(), isPending: false }),
  useTotpStatus: () => loaded({ enabled: false }),
  useTotpVerify: () => idle,
}))

vi.mock('@/lib/use-step-up', () => ({
  useStepUp: () => ({ request: state.request, dialog: null }),
}))

function show() {
  render(
    <I18nProvider i18n={i18n}>
      <UserLogin />
    </I18nProvider>
  )
}

const row = () => screen.getByText('Laptop').closest('tr') as HTMLElement

describe('Passkeys', () => {
  beforeEach(() => {
    for (const spy of [state.rename, state.finish, state.request])
      spy.mockReset()
  })

  it('starts each rename from the current name', () => {
    show()
    const passkey = row()
    const rename = () =>
      fireEvent.click(
        within(passkey).getByRole('button', { name: 'Rename passkey' })
      )
    rename()
    const field = within(passkey).getByRole('textbox')
    fireEvent.change(field, { target: { value: 'Scratch' } })
    fireEvent.keyDown(field, { key: 'Escape' })
    rename()
    expect(within(passkey).getByRole('textbox')).toHaveValue('Laptop')
  })

  it('sends no rename when only spaces were added', () => {
    show()
    const passkey = row()
    fireEvent.click(
      within(passkey).getByRole('button', { name: 'Rename passkey' })
    )
    const field = within(passkey).getByRole('textbox')
    fireEvent.change(field, { target: { value: 'Laptop  ' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(state.rename).not.toHaveBeenCalled()
  })

  it('registers a new passkey under its trimmed name', async () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: /Add passkey/ }))
    fireEvent.change(screen.getByLabelText('Passkey name'), {
      target: { value: '  Work key  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Register/ }))
    const run = state.request.mock.calls[0][0] as (token: string) => Promise<void>
    await act(async () => run('proof'))
    expect(state.finish.mock.lastCall?.[0].name).toBe('Work key')
  })
})
