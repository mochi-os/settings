// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SystemDocuments } from './documents'

const state = vi.hoisted(() => ({ navigate: vi.fn() }))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => state.navigate,
}))

vi.mock('@/routes/_authenticated/system/documents', () => ({
  Route: { useSearch: () => ({ tab: 'rules', language: 'en' }) },
}))

vi.mock('@/lib/use-step-up', () => ({
  useStepUp: () => ({ request: vi.fn(), dialog: null }),
}))

vi.mock('@/hooks/use-system-documents', () => ({
  useSystemDocumentsData: () => ({
    data: {
      documents: ['rules', 'terms', 'privacy'].map((name) => ({
        name,
        language: 'en',
      })),
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useSystemDocument: () => ({
    data: {
      name: 'rules',
      language: 'en',
      body: 'Be kind.',
      default: 'Be kind.',
      updated: 0,
    },
    isLoading: false,
  }),
  useSetSystemDocument: () => ({ mutate: vi.fn(), isPending: false }),
}))

function show() {
  render(
    <I18nProvider i18n={i18n}>
      <SystemDocuments />
    </I18nProvider>
  )
}

// Radix tabs switch on mouse down, not click.
function openTab(name: string) {
  const tab = screen.getByRole('tab', { name })
  fireEvent.mouseDown(tab, { button: 0 })
  fireEvent.click(tab)
}

describe('Document editor', () => {
  beforeEach(() => state.navigate.mockReset())

  it('switches document at once when nothing is edited', () => {
    show()
    openTab('Terms and conditions')
    expect(state.navigate).toHaveBeenCalledTimes(1)
    expect(state.navigate.mock.lastCall?.[0].search.tab).toBe('terms')
  })

  it('asks before an unsaved edit is dropped', () => {
    show()
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Be kind. Be brief.' },
    })
    openTab('Terms and conditions')
    expect(state.navigate).not.toHaveBeenCalled()
    expect(screen.getByText('Discard unsaved changes?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(state.navigate.mock.lastCall?.[0].search.tab).toBe('terms')
  })
})
