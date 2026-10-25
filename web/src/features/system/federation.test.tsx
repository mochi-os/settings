// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { SystemHosts } from '@/types/moderation'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SystemFederation } from './federation'

const state = vi.hoisted(() => ({ data: null as SystemHosts | null }))

vi.mock('@mochi/web', async (original) => ({
  ...(await original<typeof import('@mochi/web')>()),
  usePageTitle: () => {},
}))

vi.mock('@/hooks/use-system-moderation', () => ({
  useSystemHosts: () => ({
    data: state.data,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}))

function show(data: SystemHosts) {
  state.data = data
  render(
    <I18nProvider i18n={i18n}>
      <SystemFederation />
    </I18nProvider>
  )
}

describe('System federation', () => {
  beforeEach(() => {
    i18n.load('en', {})
    i18n.activate('en')
  })

  it("shows each network's servers, a host held back by the request limit, and the XMPP clients", () => {
    show({
      fediverse: [
        {
          host: 'busy.example',
          failures: 0,
          success: 1700000000,
          failure: 0,
          next: 0,
          error: '',
          waiting: 12,
          limited: true,
        },
        {
          host: 'down.example',
          failures: 4,
          success: 0,
          failure: 1700000000,
          next: 1700003600,
          error: 'connection refused',
          waiting: 3,
          limited: false,
        },
      ],
      matrix: [
        { server: 'matrix.example', failures: 2, next: 1700000000, waiting: 5 },
      ],
      xmpp: {
        links: [
          {
            server: 'chat.example',
            domain: 'example.com',
            up: true,
            failures: 0,
            next: 0,
            waiting: 0,
          },
        ],
        sessions: { clients: 3, accounts: 1 },
      },
    })
    expect(screen.getByText('busy.example')).toBeTruthy()
    expect(screen.getAllByText('At its request limit')).toHaveLength(1)
    expect(screen.getByText('connection refused')).toBeTruthy()
    expect(screen.getByText('matrix.example')).toBeTruthy()
    expect(screen.getByText('chat.example')).toBeTruthy()
    expect(screen.getByText('Connected')).toBeTruthy()
    expect(screen.getByText('3 clients signed in · 1 account')).toBeTruthy()
  })

  it('says when a network has no servers', () => {
    show({
      fediverse: [],
      matrix: [],
      xmpp: { links: [], sessions: { clients: 0, accounts: 0 } },
    })
    expect(screen.getAllByText('No servers yet.')).toHaveLength(3)
  })
})
