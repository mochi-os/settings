// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { StrictMode, type ReactNode } from 'react'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLinkResult, useOauthResult } from './use-oauth-result'

const state = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))

vi.mock('@mochi/web', async (original) => ({
  ...(await original<typeof import('@mochi/web')>()),
  toast: { success: state.success, error: state.error },
}))

const wrapper = ({ children }: { children: ReactNode }) => (
  <StrictMode>
    <I18nProvider i18n={i18n}>{children}</I18nProvider>
  </StrictMode>
)

// A link's one-shot result is said once: not again on StrictMode's double
// mount or a rerender, and taken off the address, so a reload does not say it
// again either.
describe.each([
  ['useLinkResult', useLinkResult, 'linked=a1', 'linked'],
  ['useOauthResult', useOauthResult, 'oauth_linked=github', 'oauth_linked'],
])('%s', (_, hook, query, param) => {
  let run = 0
  beforeEach(() => {
    i18n.load('en', {})
    i18n.activate('en')
    state.success.mockReset()
    state.error.mockReset()
    run++
    // A distinct result each case, as each return from a server is.
    window.history.replaceState(null, '', `/settings/user/networks?tab=x&${query}${run}`)
  })

  it('says the result once', async () => {
    const { rerender } = renderHook(() => hook(), { wrapper })
    rerender()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(state.success).toHaveBeenCalledTimes(1)
  })

  // Inside the shell's sandboxed iframe the page's own address cannot be
  // replaced, so the result stays on it when a language change runs the
  // effect again.
  it('says the result once where the address cannot be replaced', async () => {
    const replace = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {})
    try {
      renderHook(() => hook(), { wrapper })
      await act(async () => {
        i18n.load('de', {})
        i18n.activate('de')
      })
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
      expect(state.success).toHaveBeenCalledTimes(1)
    } finally {
      replace.mockRestore()
    }
  })

  it('takes the result off the address and keeps the rest', async () => {
    renderHook(() => hook(), { wrapper })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const params = new URLSearchParams(window.location.search)
    expect(params.has(param)).toBe(false)
    expect(params.get('tab')).toBe('x')
    expect(window.location.pathname).toBe('/settings/user/networks')
  })
})
