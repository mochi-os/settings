// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ComboSelect } from './combo-select'

// cmdk measures and scrolls items the test DOM does not lay out.
Element.prototype.scrollIntoView = vi.fn()

const languages: Record<string, string> = {
  auto: 'Automatic',
  de: 'Deutsch',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  ja: '日本語',
  nl: 'Nederlands',
  pl: 'Polski',
  pt: 'Português',
}

function show(options: Record<string, string>) {
  render(
    <I18nProvider i18n={i18n}>
      <ComboSelect value='en' options={options} onChange={vi.fn()} />
    </I18nProvider>
  )
  fireEvent.click(screen.getByRole('combobox'))
}

describe('ComboSelect', () => {
  it('filters a long list by the names shown, not the stored values', () => {
    show(languages)
    fireEvent.change(screen.getByLabelText('Search'), {
      target: { value: 'deut' },
    })
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Deutsch',
    ])
  })

  it('offers no search box for a short list', () => {
    show({ light: 'Light', dark: 'Dark' })
    expect(screen.queryByLabelText('Search')).toBeNull()
    expect(screen.getAllByRole('option')).toHaveLength(2)
  })
})
