// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useInstallSystemUpdate } from './use-system-update'

const post = vi.fn(async () => ({ installed: true }))

vi.mock('@mochi/web', async (original) => ({
  ...(await original<typeof import('@mochi/web')>()),
  requestHelpers: { post: (...args: unknown[]) => post(...(args as [])) },
}))

describe('useInstallSystemUpdate', () => {
  // The install is its own action, which only a POST reaches; the update
  // information beside it is a read a GET may run.
  it('posts the reauthentication to the install action, not the information one', async () => {
    const client = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useInstallSystemUpdate(), { wrapper })
    await act(() => result.current.mutateAsync('proof'))
    expect(post).toHaveBeenCalledWith(
      '-/system/update/install',
      'token=proof',
      expect.anything()
    )
  })
})
