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
}))

vi.mock('@mochi/web', async (original) => ({
  ...(await original<typeof import('@mochi/web')>()),
  shellNavigateTop: state.navigate,
  toast: { success: state.success, error: vi.fn() },
}))

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
})
