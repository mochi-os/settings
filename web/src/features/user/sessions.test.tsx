// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserSessions } from './sessions'

const state = vi.hoisted(() => ({
  navigate: vi.fn(),
  success: vi.fn(),
  revoked: [] as string[],
}))

vi.mock('@mochi/web', async (original) => ({
  ...(await original<typeof import('@mochi/web')>()),
  shellNavigateTop: state.navigate,
  toast: { success: state.success, error: vi.fn() },
}))

const token = (
  hash: string,
  kind: 'signin' | 'password',
  name: string,
  device = ''
) => ({
  hash,
  name,
  created: 1,
  used: 2,
  expires: 0,
  kind,
  client: { id: 'c1', name: kind === 'signin' ? name : '', website: '' },
  account: 'f1',
  address: 'alice@example.com',
  network: 'fediverse',
  device,
})

const session = (id: string, agent: string, current = false) => ({
  id,
  address: '127.0.0.1',
  agent,
  created: 1,
  accessed: current ? 3 : 2,
  expires: 9,
  current,
})

vi.mock('@/hooks/use-account', () => ({
  useAgentName: () => (agent: string) => agent,
  useSessions: () => ({
    data: {
      sessions: [session('a', 'Firefox', true), session('b', 'Chrome')],
      signins: [token('s1', 'signin', 'Ivory', 'phone')],
      passwords: [token('p1', 'password', 'Laptop')],
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useRevokeSession: () => ({
    mutate: (_id: string, options: { onSuccess: () => void }) =>
      options.onSuccess(),
    isPending: false,
  }),
  useRevokeToken: () => ({
    mutate: (hash: string, options: { onSuccess: () => void }) => {
      state.revoked.push(hash)
      options.onSuccess()
    },
    isPending: false,
  }),
}))

function revoke(agent: string) {
  const row = screen.getByText(agent).closest('tr') as HTMLElement
  fireEvent.click(within(row).getByRole('button', { name: /Revoke session/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Revoke' }))
}

describe('Revoking a session', () => {
  beforeEach(() => {
    state.navigate.mockReset()
    state.success.mockReset()
    state.revoked.length = 0
    render(
      <I18nProvider i18n={i18n}>
        <UserSessions />
      </I18nProvider>
    )
  })

  it('leaves for the sign-in page when the session is this one', () => {
    revoke('Firefox')
    // Every request after this is refused, so staying would strand the page.
    expect(state.navigate).toHaveBeenCalledWith('/')
  })

  it('stays when another session is revoked', () => {
    revoke('Chrome')
    expect(state.navigate).not.toHaveBeenCalled()
    expect(state.success).toHaveBeenCalled()
  })

  it('lists the apps signed in and the minted passwords with their accounts', () => {
    expect(screen.getByText('Apps signed in')).toBeTruthy()
    expect(screen.getByText('Ivory')).toBeTruthy()
    expect(screen.getByText('phone')).toBeTruthy()
    expect(screen.getByText('Passwords')).toBeTruthy()
    expect(screen.getByText('Laptop')).toBeTruthy()
    expect(screen.getAllByText('alice@example.com')).toHaveLength(2)
  })

  it('revokes a sign-in by its hash and stays on the page', () => {
    const row = screen.getByText('Ivory').closest('tr') as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: /Revoke/ }))
    expect(screen.getByText('Revoke this sign-in?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }))
    expect(state.revoked).toEqual(['s1'])
    expect(state.navigate).not.toHaveBeenCalled()
    expect(state.success).toHaveBeenCalledWith('Sign-in revoked')
  })
})
