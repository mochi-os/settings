// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Domains } from './index'

const idle = { mutate: vi.fn(), isPending: false }
const query = (data: unknown) => ({
  data,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
})

vi.mock('@/hooks/use-domains', () => ({
  useDomainsData: () =>
    query({
      domains: [
        {
          domain: 'example.com',
          verified: 1,
          token: 'secret',
          tls: 1,
          certificate: false,
          https: true,
          created: 0,
          updated: 0,
        },
      ],
      delegations: [],
      count: 1,
      admin: true,
    }),
  useDomainDetails: (domain: string) =>
    query(
      domain
        ? {
            domain: { domain },
            routes: [
              {
                domain,
                path: '/blog',
                method: 'entity',
                target: 'e1',
                target_name: 'Blog',
                context: '',
                priority: 0,
                enabled: 1,
                created: 0,
                updated: 0,
              },
            ],
            delegations: [],
            admin: true,
          }
        : undefined
    ),
  useCreateDomain: () => idle,
  useUpdateDomain: () => idle,
  useDeleteDomain: () => idle,
  useVerifyDomain: () => idle,
  useCreateRoute: () => idle,
  useUpdateRoute: () => idle,
  useDeleteRoute: () => idle,
  useCreateDelegation: () => idle,
  useDeleteDelegation: () => idle,
  useUserSearch: (search: string) =>
    query(
      search.length >= 2
        ? [
            { uid: 'u1', username: 'ada@example.com', role: 'administrator' },
            { uid: 'u2', username: 'bob@example.com', role: 'user' },
          ]
        : undefined
    ),
  useApps: () => query([]),
  useEntities: () => query([]),
}))

function show() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider i18n={i18n}>
        <Domains />
      </I18nProvider>
    </QueryClientProvider>
  )
}

function expand() {
  const header = screen.getByRole('button', { name: /example\.com/ })
  fireEvent.click(header)
  return header
}

describe('Domains', () => {
  it('expands a domain from a real button, so the keyboard reaches it', () => {
    show()
    const header = screen.getByRole('button', { name: /example\.com/ })
    expect(header.tagName).toBe('BUTTON')
    expect(header).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(header)
    expect(header).toHaveAttribute('aria-expanded', 'true')
  })

  it("shows a route's method by its label, not its raw value", () => {
    show()
    expand()
    const row = screen.getByText('/blog').closest('tr') as HTMLElement
    expect(within(row).getByText('Entity')).toBeInTheDocument()
    expect(within(row).queryByText('entity')).toBeNull()
  })

  it("names a found user's role in words", () => {
    show()
    expand()
    fireEvent.click(screen.getByRole('button', { name: 'Add delegation' }))
    const field = screen.getByPlaceholderText('Search for a user...')
    fireEvent.focus(field)
    fireEvent.change(field, { target: { value: 'ad' } })
    const ada = screen.getByText('ada@example.com').closest('button')!
    expect(within(ada).getByText('Administrator')).toBeInTheDocument()
    const bob = screen.getByText('bob@example.com').closest('button')!
    expect(within(bob).getByText('User')).toBeInTheDocument()
    expect(screen.queryByText('administrator')).toBeNull()
  })
})
