// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAccountKeysRecovery } from './use-networks'

const post = vi.fn()

vi.mock('@mochi/web', async (original) => ({
  ...(await original<typeof import('@mochi/web')>()),
  requestHelpers: { post: (...args: unknown[]) => post(...args) },
}))

// Making a recovery key refreshes the account list, whose recovery flag says
// whether the account still needs one, as well as the account's keys.
describe('useAccountKeysRecovery', () => {
  it('refreshes the account list and the keys', async () => {
    post.mockResolvedValue({ public: 'did:key:z', private: '00' })
    const client = new QueryClient()
    client.setQueryData(['networks'], { accounts: [{ id: 'b1', recovery: false }] })
    client.setQueryData(['networks', 'keys', 'b1'], { keys: [] })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useAccountKeysRecovery(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync('b1')
    })
    expect(client.getQueryState(['networks'])?.isInvalidated).toBe(true)
    expect(client.getQueryState(['networks', 'keys', 'b1'])?.isInvalidated).toBe(true)
  })
})
