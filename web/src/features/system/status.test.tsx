// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SystemStatus } from './status'
import type { SystemNetworks } from '@/types/networks'

const state = vi.hoisted(() => ({
  networks: null as SystemNetworks | null,
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
}))

vi.mock('@/lib/use-step-up', () => ({
  useStepUp: () => ({ request: vi.fn(), dialog: null }),
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
  })

  it('shows nothing of the networks where the server does not offer them', () => {
    show({ development: false, networks: {} })
    expect(screen.queryByText('Other networks')).toBeNull()
  })
})
