// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import {
  useExportData,
  useOauthLink,
  useRecoveryGenerate,
  useTotpSetup,
} from './use-account'

const post = vi.fn()

vi.mock('@mochi/web', async (original) => ({
  ...(await original<typeof import('@mochi/web')>()),
  requestHelpers: { post: (...args: unknown[]) => post(...args) },
}))

let client = new QueryClient()

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
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

describe('secret mutations', () => {
  // Each call's input or answer is a secret the page shows once and drops;
  // React Query would otherwise keep it on the settled mutation for minutes.
  // Each hook reduced to what the test drives: run it, and it answers.
  type Secret = () => { run: (variables: never) => Promise<unknown> }
  const cases: {
    name: string
    hook: Secret
    variables: unknown
    answer: unknown
  }[] = [
    {
      name: 'export',
      hook: useExportData as Secret,
      variables: { passphrase: 'correct horse battery staple', token: 'p' },
      answer: { filename: 'export.zip' },
    },
    {
      name: 'authenticator setup',
      hook: useTotpSetup as Secret,
      variables: 'p',
      answer: { secret: 'JBSWY3DPEHPK3PXP', url: 'otpauth://totp/x' },
    },
    {
      name: 'recovery codes',
      hook: useRecoveryGenerate as Secret,
      variables: 'p',
      answer: { codes: ['aaaa-bbbb', 'cccc-dddd'] },
    },
  ]

  for (const c of cases) {
    it(`keeps nothing of the ${c.name} call once it has answered`, async () => {
      client = new QueryClient()
      post.mockReset().mockResolvedValue(c.answer)
      const { result } = renderHook(() => c.hook(), { wrapper })
      const run = result.current.run as (v: unknown) => Promise<unknown>
      expect(await run(c.variables)).toEqual(c.answer)
      await waitFor(() =>
        expect(client.getMutationCache().getAll()).toHaveLength(0)
      )
    })
  }
})
