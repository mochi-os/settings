// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { interestLink } from '@/lib/interests'
import { UserInterests } from './interests'

type Search = {
  term: string
  options: { onSuccess: (data: { results: unknown[] }) => void }
}

const state = vi.hoisted(() => ({
  language: 'de',
  searches: [] as Search[],
}))

vi.mock('@/hooks/use-interests', () => ({
  useInterests: () => ({
    data: {
      interests: [{ qid: 'Q11442', label: 'Fahrrad', weight: 50, updated: 0 }],
      summary: '',
      language: state.language,
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useInterestSet: () => ({ mutate: vi.fn(), isPending: false }),
  useInterestRemove: () => ({ mutate: vi.fn(), isPending: false }),
  useInterestSearch: () => ({
    mutate: (term: string, options: Search['options']) =>
      state.searches.push({ term, options }),
    isPending: false,
  }),
  useInterestSummary: () => ({ mutate: vi.fn(), isPending: false }),
}))

function show() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider i18n={i18n}>
        <UserInterests />
      </I18nProvider>
    </QueryClientProvider>
  )
}

const bicycle = { qid: 'Q11442', label: 'Bicycle', description: 'vehicle' }

describe('interest links', () => {
  it('open the Wikipedia of the language the label is in, then English', () => {
    expect(interestLink('Q1', 'de')).toBe(
      'https://www.wikidata.org/wiki/Special:GoToLinkedPage/dewiki,enwiki/Q1'
    )
    expect(interestLink('Q1', 'zh-hans')).toContain('/zhwiki,enwiki/Q1')
    expect(interestLink('Q1', 'nb')).toContain('/nowiki,enwiki/Q1')
  })

  it('name English once', () => {
    expect(interestLink('Q1', 'en')).toContain('/enwiki/Q1')
    expect(interestLink('Q1', undefined)).toContain('/enwiki/Q1')
  })

  it('follow the language the server resolved the labels in', () => {
    state.language = 'de'
    show()
    expect(screen.getByRole('link', { name: 'Fahrrad' })).toHaveAttribute(
      'href',
      interestLink('Q11442', 'de')
    )
  })
})

describe('interest list', () => {
  it('names each remove button after its interest', () => {
    show()
    expect(
      screen.getByRole('button', { name: 'Remove Fahrrad' })
    ).toBeInTheDocument()
  })
})

describe('interest search', () => {
  beforeEach(() => {
    state.searches = []
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  function type(value: string) {
    fireEvent.change(screen.getByPlaceholderText('Search topics to add...'), {
      target: { value },
    })
  }

  it('shows the results for the query in the box', () => {
    show()
    type('bicy')
    act(() => vi.advanceTimersByTime(300))
    expect(state.searches.map((s) => s.term)).toEqual(['bicy'])
    act(() => state.searches[0].options.onSuccess({ results: [bicycle] }))
    expect(screen.getByText('Bicycle')).toBeInTheDocument()
  })

  it('drops results for a query the box no longer holds', () => {
    show()
    type('bicy')
    act(() => vi.advanceTimersByTime(300))
    // The query is cut below the minimum while the search is in flight.
    type('b')
    act(() => state.searches[0].options.onSuccess({ results: [bicycle] }))
    expect(screen.queryByText('Bicycle')).toBeNull()
  })

  it('drops results for a query that was replaced before they arrived', () => {
    show()
    type('bicy')
    act(() => vi.advanceTimersByTime(300))
    type('tram')
    act(() => state.searches[0].options.onSuccess({ results: [bicycle] }))
    expect(screen.queryByText('Bicycle')).toBeNull()
  })
})
