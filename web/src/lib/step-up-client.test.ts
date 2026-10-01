// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stepUpClient } from './step-up-client'

const state = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock('@mochi/web', async (original) => {
  const actual = await original<typeof import('@mochi/web')>()
  return {
    ...actual,
    requestHelpers: { ...actual.requestHelpers, post: state.post },
  }
})

describe('OAuth step-up verification', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Inside the shell the popup handle is null, so nothing but the dialog
    // can end the wait.
    vi.spyOn(window, 'open').mockReturnValue(null)
    state.post.mockReset()
    state.post.mockImplementation((url: string) =>
      Promise.resolve(url.includes('begin') ? { url: 'https://idp' } : {})
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('stops polling once its dialog aborts', async () => {
    const controller = new AbortController()
    const verify = stepUpClient.oauthVerify('github', controller.signal)
    const outcome = verify.catch((error: Error) => error.message)
    // The challenge is hashed off the timer queue, so wait for the begin.
    await vi.waitFor(() => expect(state.post).toHaveBeenCalled())
    await vi.advanceTimersByTimeAsync(2500)
    const polled = state.post.mock.calls.length
    expect(polled).toBeGreaterThan(1)

    controller.abort()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(await outcome).toBe('oauth-cancelled')
    expect(state.post.mock.calls.length).toBe(polled)
  })
})
