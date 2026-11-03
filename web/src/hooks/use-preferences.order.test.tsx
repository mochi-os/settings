// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { apiClient } from '@mochi/web'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useApplyDisplayPreferences,
  useReapplyDisplayPreferences,
  useSetPreference,
} from './use-preferences'

const colour = vi.hoisted(() => vi.fn())

vi.mock('@mochi/web', async (original) => ({
  ...(await original<typeof import('@mochi/web')>()),
  useTheme: () => ({ setTheme: vi.fn(), setColorTheme: colour }),
}))

const theme = (id: string, hue: number) => ({
  id,
  app: 'app1',
  label: id,
  hue,
  chroma: 0.1,
  hue_bg: hue,
})

// The server takes each save in the order it was sent and answers whenever
// the test says, so answers can come back in any order.
function server() {
  const saved: Record<string, string> = {
    appearance: 'auto',
    theme: '',
    density: 'theme',
    radius: 'theme',
    card: 'theme',
    background: 'theme',
    font: 'theme',
    font_size: 'theme',
  }
  const answers: (() => void)[] = []
  vi.spyOn(apiClient, 'get').mockImplementation(async () => ({
    data: {
      preferences: { ...saved },
      themes: [
        theme('app1:blue', 250),
        theme('app1:amber', 71),
        theme('app1:green', 143),
        theme('app1:red', 317),
      ],
      presets: {},
      default_theme: 'app1:blue',
    },
  }))
  vi.spyOn(apiClient, 'post').mockImplementation((_url, body) => {
    Object.assign(saved, body)
    return new Promise((resolve) => answers.push(() => resolve({ data: {} })))
  })
  return answers
}

const hue = () => String(colour.mock.lastCall?.[0]?.hue)

// The display page's whole path: the layout applies the preferences cache,
// which the save changes on the click, and the page applies it again as each
// save answers so the shell re-reads its theme once the server has the pick.
describe('display picks answered out of order', () => {
  beforeEach(() => colour.mockReset())
  afterEach(() => vi.restoreAllMocks())

  it('ends on the last of three theme picks, applied again after the last answer', async () => {
    const answers = server()
    const queryClient = new QueryClient()
    const { result } = renderHook(
      () => {
        useApplyDisplayPreferences()
        return {
          save: useSetPreference(),
          reapply: useReapplyDisplayPreferences(),
        }
      },
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      }
    )
    await waitFor(() => expect(hue()).toBe('250'))

    const picks = ['app1:amber', 'app1:green', 'app1:red']
    for (const [index, id] of picks.entries()) {
      act(() => {
        void result.current.save
          .mutateAsync({ theme: id })
          .then(result.current.reapply)
      })
      await waitFor(() => expect(answers).toHaveLength(index + 1))
    }
    expect(hue()).toBe('317')

    // Answered third, first, second.
    act(() => answers[2]())
    await waitFor(() => expect(queryClient.isMutating()).toBe(2))
    act(() => answers[0]())
    await waitFor(() => expect(queryClient.isMutating()).toBe(1))
    const before = colour.mock.calls.length
    act(() => answers[1]())
    await waitFor(() => expect(queryClient.isMutating()).toBe(0))
    await waitFor(() => expect(queryClient.isFetching()).toBe(0))
    expect(colour.mock.calls.length).toBeGreaterThan(before)
    expect(hue()).toBe('317')
  })
})
