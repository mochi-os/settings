// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useSystemHandles } from './use-system-networks'

const post = vi.fn()

vi.mock('@mochi/web', async (original) => ({
  ...(await original<typeof import('@mochi/web')>()),
  requestHelpers: { post: (...args: unknown[]) => post(...args) },
}))

const client = new QueryClient()

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useSystemHandles', () => {
  it('asks the server for the page of the search, each page its own query', async () => {
    post.mockResolvedValue({ handles: [], count: 0, domains: [] })
    const { rerender } = renderHook(
      ({ offset, search }) => useSystemHandles(25, offset, search),
      { wrapper, initialProps: { offset: 0, search: '' } }
    )
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    expect(post.mock.calls[0]).toEqual([
      '-/system/handles/list',
      { limit: 25, offset: 0, search: '' },
    ])
    rerender({ offset: 25, search: 'ali' })
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2))
    expect(post.mock.calls[1]).toEqual([
      '-/system/handles/list',
      { limit: 25, offset: 25, search: 'ali' },
    ])
  })
})
