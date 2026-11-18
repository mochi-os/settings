// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useUpdateDomain } from './use-domains'

const post = vi.fn()

vi.mock('@mochi/web', async (original) => ({
  ...(await original<typeof import('@mochi/web')>()),
  requestHelpers: { post: (...args: unknown[]) => post(...args) },
}))

const row = (domain: string) => ({
  domain,
  verified: 0,
  tls: 1,
  certificate: false,
  https: true,
  created: 0,
  updated: 0,
})

describe('useUpdateDomain', () => {
  // The Verified and TLS switches read the domain, so they move when
  // clicked, not once the server has answered and the list been read again,
  // and go back when the change is refused.
  it('shows the change at once in the list and the details, and puts it back when refused', async () => {
    const client = new QueryClient()
    client.setQueryData(['domains'], {
      domains: [row('a.example'), row('b.example')],
      count: 2,
      admin: true,
    })
    client.setQueryData(['domains', 'a.example'], {
      domain: row('a.example'),
      routes: [],
      delegations: [],
      admin: true,
    })
    let refuse: (error: Error) => void = () => {}
    post.mockImplementation(() => new Promise((_, reject) => (refuse = reject)))
    const { result } = renderHook(() => useUpdateDomain(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    const listed = (domain: string) =>
      client
        .getQueryData<{
          domains: { domain: string; verified: number; tls: number }[]
        }>(['domains'])
        ?.domains.find((d) => d.domain === domain)
    const detail = () =>
      client.getQueryData<{ domain: { verified: number; tls: number } }>([
        'domains',
        'a.example',
      ])?.domain

    act(() => result.current.mutate({ domain: 'a.example', verified: true }))
    await waitFor(() => expect(listed('a.example')?.verified).toBe(1))
    expect(detail()?.verified).toBe(1)
    expect(listed('a.example')?.tls).toBe(1)
    expect(listed('b.example')?.verified).toBe(0)
    await act(async () => refuse(new Error('refused')))
    await waitFor(() => expect(listed('a.example')?.verified).toBe(0))
    expect(detail()?.verified).toBe(0)
  })

  it('shows a TLS change at once', async () => {
    const client = new QueryClient()
    client.setQueryData(['domains'], {
      domains: [row('a.example')],
      count: 1,
      admin: true,
    })
    post.mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(() => useUpdateDomain(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    act(() => result.current.mutate({ domain: 'a.example', tls: false }))
    await waitFor(() =>
      expect(
        client.getQueryData<{ domains: { tls: number; verified: number }[] }>([
          'domains',
        ])?.domains[0]
      ).toMatchObject({ tls: 0, verified: 0 })
    )
  })
})
