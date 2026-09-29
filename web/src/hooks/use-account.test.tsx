// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useOauthLink } from './use-account'

const post = vi.fn()

vi.mock('@mochi/web', async (original) => ({
  ...(await original<typeof import('@mochi/web')>()),
  requestHelpers: { post: (...args: unknown[]) => post(...args) },
}))

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  )
}

describe('useOauthLink', () => {
  // The shell's sandboxed frame reaches core's /_/ begin route as a
  // cross-site request, which that route refuses; the app's own action is
  // the way through.
  it("starts the link through the app's own action, with the step-up proof", async () => {
    post.mockResolvedValue({ url: 'https://github.com/login/oauth/authorize' })
    const { result } = renderHook(() => useOauthLink(), { wrapper })

    const answer = await result.current.mutateAsync({
      provider: 'github',
      token: 'proof',
    })

    expect(answer.url).toBe('https://github.com/login/oauth/authorize')
    expect(post).toHaveBeenCalledTimes(1)
    const [url, body] = post.mock.calls[0]
    expect(url).toBe('-/user/account/oauth/link')
    expect(body).toEqual({
      provider: 'github',
      token: 'proof',
      target: window.location.pathname,
    })
  })
})
