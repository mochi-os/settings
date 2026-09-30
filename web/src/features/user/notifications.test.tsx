// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UserNotifications } from './notifications'

const state = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock('@tanstack/react-router', () => ({
  useSearch: () => ({}),
  useNavigate: () => vi.fn(),
}))

vi.mock('@mochi/web', async (original) => {
  const actual = await original<typeof import('@mochi/web')>()
  return {
    ...actual,
    usePush: () => ({ supported: false, supportChecked: true }),
    requestHelpers: {
      ...actual.requestHelpers,
      get: vi.fn((url: string) =>
        Promise.resolve(
          url.includes('destinations')
            ? { accounts: [], feeds: [], devices: [] }
            : [
                {
                  id: '7',
                  label: 'Harness',
                  default: 0,
                  created: 0,
                  destinations: [],
                },
                {
                  id: '8',
                  label: 'Second',
                  default: 0,
                  created: 0,
                  destinations: [],
                },
              ]
        )
      ),
      post: state.post,
    },
  }
})

describe('Notification categories', () => {
  it('sends one test at a time, however often Test is pressed', async () => {
    let finish: (value: unknown) => void = () => {}
    state.post.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      })
    )
    render(
      <QueryClientProvider client={new QueryClient()}>
        <I18nProvider i18n={i18n}>
          <UserNotifications />
        </I18nProvider>
      </QueryClientProvider>
    )
    const [test, other] = await screen.findAllByRole('button', { name: /Test/ })
    await act(async () => {
      fireEvent.click(test)
    })
    expect(test).toBeDisabled()
    // Another category's test waits for the one in flight too.
    await act(async () => {
      fireEvent.click(other)
    })
    expect(state.post).toHaveBeenCalledTimes(1)
    await act(async () => finish({ sent: 1, failed: 0, total: 1, web: false }))
    expect(test).not.toBeDisabled()
  })
})
