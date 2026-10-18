// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { SystemNetworks } from '@/types/networks'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SystemStatus } from './status'

const state = vi.hoisted(() => ({
  networks: null as SystemNetworks | null,
  replace: vi.fn(),
}))

vi.mock('@mochi/web', async (original) => ({
  ...(await original<typeof import('@mochi/web')>()),
  usePageTitle: () => {},
}))

vi.mock('@/hooks/use-system-settings', () => ({
  useSystemSettingsData: () => ({
    data: {
      settings: [
        { name: 'server_version', value: '2.0.12' },
        { name: 'server_started', value: '1700000000' },
      ],
      server: { id: '', fingerprint: '' },
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}))

vi.mock('@/hooks/use-system-update', () => ({
  useSystemUpdate: () => ({ data: undefined }),
  useInstallSystemUpdate: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/hooks/use-system-peers', () => ({
  useSystemPeers: () => ({
    data: {
      peers: [],
      network: {
        reachability: 'public',
        relay: false,
        mesh: 0,
        last: 0,
        queued: 0,
        unresolved: 0,
      },
      counts: { users: 1, entities: 1 },
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}))

vi.mock('@/hooks/use-system-networks', () => ({
  useSystemNetworks: () => ({
    data: state.networks,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useSystemKeyReplace: () => ({
    mutateAsync: state.replace,
    isPending: false,
    variables: undefined,
  }),
}))

// The step-up passes straight through with a token.
vi.mock('@/lib/use-step-up', () => ({
  useStepUp: () => ({
    request: (run: (token: string) => Promise<void>) => run('t1'),
    dialog: null,
  }),
}))

function show(networks: SystemNetworks) {
  state.networks = networks
  render(
    <I18nProvider i18n={i18n}>
      <SystemStatus />
    </I18nProvider>
  )
}

describe('Status: other networks', () => {
  beforeEach(() => {
    i18n.load('en', {})
    i18n.activate('en')
  })

  it('shows each network as working, unavailable with the reason, or disabled', () => {
    show({
      development: true,
      networks: {
        fediverse: { state: 'working', reason: '' },
        bluesky: {
          state: 'working',
          reason: '',
          certificates: { issued: 3, limit: 50 },
          budget: {
            hour: { used: 12, limit: 1500 },
            day: { used: 40, limit: 10000 },
          },
          relay: {
            host: 'example.com',
            status: 'active',
            accounts: 3,
            limit: 100,
          },
        },
        xmpp: { state: 'unavailable', reason: 'domain' },
        matrix: { state: 'disabled', reason: '' },
      },
    })
    expect(screen.getByText('Other networks')).toBeTruthy()
    expect(screen.getByText('Fediverse')).toBeTruthy()
    expect(screen.getByText('Working')).toBeTruthy()
    expect(
      screen.getByText('Unavailable · No domain is configured')
    ).toBeTruthy()
    expect(screen.getByText('Disabled')).toBeTruthy()
    expect(screen.getByText(/Certificates this week 3 \/ 50/)).toBeTruthy()
    expect(
      screen.getByText(/Relay budget 12 \/ 1,500 this hour, 40 \/ 10,000 today/)
    ).toBeTruthy()
    expect(
      screen.getByText(/Relay following this server, 3 \/ 100 accounts/)
    ).toBeTruthy()
  })

  it('says when the relay does not know the server, or gave no answer', () => {
    show({
      development: true,
      networks: {
        bluesky: {
          state: 'working',
          reason: '',
          relay: { host: 'example.com', status: 'HostNotFound' },
        },
      },
    })
    expect(screen.getByText(/Relay does not know this server/)).toBeTruthy()
    expect(screen.queryByText(/accounts/)).toBeNull()
  })

  it('shows nothing of the networks where the server does not offer them', () => {
    show({ development: false, networks: {} })
    expect(screen.queryByText('Other networks')).toBeNull()
  })
})

describe('Status: Matrix server keys', () => {
  beforeEach(() => {
    i18n.load('en', {})
    i18n.activate('en')
    state.replace = vi.fn().mockResolvedValue({ key: 'ed25519:new' })
  })

  const matrix = (keys: { domain: string; key: string }[]) => ({
    development: true,
    networks: { matrix: { state: 'working' as const, reason: '', keys } },
  })

  it("lists each domain's key and replaces one once confirmed, with the step-up's token", async () => {
    show(
      matrix([
        { domain: 'b.example', key: 'ed25519:bbbb' },
        { domain: 'a.example', key: 'ed25519:aaaa' },
      ])
    )
    expect(screen.getByText('Matrix server keys')).toBeInTheDocument()
    expect(screen.getByText('ed25519:aaaa')).toBeInTheDocument()
    const rows = screen.getAllByText(/\.example$/).map((e) => e.textContent)
    expect(rows).toEqual(['a.example', 'b.example'])
    fireEvent.click(screen.getAllByRole('button', { name: 'Replace' })[1])
    expect(state.replace).not.toHaveBeenCalled()
    expect(
      await screen.findByText('Replace the Matrix server key for b.example?')
    ).toBeInTheDocument()
    const buttons = screen.getAllByRole('button', { name: /Replace/ })
    fireEvent.click(buttons[buttons.length - 1])
    await waitFor(() => expect(state.replace).toHaveBeenCalledTimes(1))
    expect(state.replace).toHaveBeenCalledWith({
      domain: 'b.example',
      token: 't1',
    })
  })

  it('shows no keys where Matrix has none', () => {
    show(matrix([]))
    expect(screen.queryByText('Matrix server keys')).toBeNull()
  })
})
