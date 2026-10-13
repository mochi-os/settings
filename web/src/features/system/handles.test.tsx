// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SystemHandles } from './handles'
import type { SystemHandles as SystemHandlesData } from '@/types/networks'

const state = vi.hoisted(() => ({
  data: null as SystemHandlesData | null,
  release: vi.fn(),
}))

vi.mock('@mochi/web', async (original) => ({
  ...(await original<typeof import('@mochi/web')>()),
  toast: { success: vi.fn(), error: vi.fn() },
  usePageTitle: () => {},
}))

vi.mock('@/hooks/use-system-networks', () => ({
  useSystemHandles: () => ({
    data: state.data,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useSystemHandleRelease: () => ({
    mutateAsync: state.release,
    isPending: false,
  }),
}))

// The chooser is the Networks page's, tested there; here only its heading
// matters.
vi.mock('@/features/user/networks', () => ({
  HandleChooser: ({ title }: { title?: string }) => <div>{title}</div>,
}))

const registry = (
  name: string,
  parent: string,
  holder: string,
  username: string,
  kind = 'handle'
) => ({
  domain: 'example.com',
  name,
  parent,
  kind,
  created: 1700000000,
  addresses: { fediverse: `${name}@example.com` },
  user: `u-${username}`,
  username,
  holder,
})

function show(data: SystemHandlesData) {
  state.data = data
  render(
    <I18nProvider i18n={i18n}>
      <SystemHandles />
    </I18nProvider>
  )
}

describe('System handles', () => {
  beforeEach(() => {
    i18n.load('en', {})
    i18n.activate('en')
    state.release.mockReset()
  })

  it('lists every handle with its holder and kind', () => {
    show({
      domains: ['example.com'],
      handles: [
        registry('admin', '', 'Root', 'root@example.com'),
        registry('alice', '', 'Alice', 'alice@example.com'),
        registry('alice_news', 'alice', 'Alice', 'alice@example.com'),
        registry('books', '', '', 'bob@example.com', 'community'),
      ],
    })
    expect(screen.getByText('admin')).toBeTruthy()
    expect(screen.getByText('alice_news')).toBeTruthy()
    expect(screen.getByText('Root')).toBeTruthy()
    expect(screen.getAllByText('alice@example.com')).toHaveLength(2)
    // A holder with no person entity shows by username alone.
    expect(screen.getByText('bob@example.com')).toBeTruthy()
    expect(screen.getByText('Community')).toBeTruthy()
    expect(screen.getByText('Name under alice')).toBeTruthy()
    expect(screen.getAllByText('Handle')).toHaveLength(2)
    expect(screen.getByText('Take a name')).toBeTruthy()
  })

  it('says when nothing is reserved', () => {
    show({ domains: ['example.com'], handles: [] })
    expect(screen.getByText('No handles have been reserved.')).toBeTruthy()
  })

  it('offers no chooser without a domain to reserve on', () => {
    show({ domains: [], handles: [] })
    expect(screen.queryByText('Take a name')).toBeNull()
  })
})
