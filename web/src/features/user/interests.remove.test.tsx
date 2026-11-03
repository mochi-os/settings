// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { requestHelpers, toast } from '@mochi/web'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserInterests } from './interests'

vi.mock('@mochi/web', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mochi/web')>()
  return {
    ...actual,
    requestHelpers: { get: vi.fn(), post: vi.fn() },
    toast: { ...actual.toast, error: vi.fn(), success: vi.fn() },
  }
})

// Removing an interest takes its row off at once; a refusal puts the row back
// and says so. The remove request waits until the test answers it.
let refuse: (error: unknown) => void
beforeEach(() => {
  vi.mocked(toast.error).mockClear()
  vi.mocked(requestHelpers.get).mockResolvedValue({
    interests: [
      { qid: 'Q11442', label: 'Bicycle', weight: 50, updated: 0 },
      { qid: 'Q7366', label: 'Song', weight: 20, updated: 0 },
    ],
    summary: '',
    language: 'en',
  })
  vi.mocked(requestHelpers.post).mockImplementation(
    () =>
      new Promise<never>((_resolve, reject) => {
        refuse = reject
      })
  )
})

function show() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider i18n={i18n}>
        <UserInterests />
      </I18nProvider>
    </QueryClientProvider>
  )
}

describe('removing an interest', () => {
  it('takes the row off at once and puts it back with an error when refused', async () => {
    show()
    fireEvent.click(
      await screen.findByRole('button', { name: 'Remove Bicycle' })
    )

    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Bicycle' })).toBeNull()
    )
    expect(screen.getByRole('link', { name: 'Song' })).toBeInTheDocument()

    act(() => refuse(new Error('refused')))
    expect(
      await screen.findByRole('link', { name: 'Bicycle' })
    ).toBeInTheDocument()
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1))
  })
})
