// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { systemDocumentQuery } from './use-system-documents'

// The address each request went to, as the library's client sent it.
let asked: URL[] = []

beforeEach(() => {
  asked = []
  vi.stubGlobal('fetch', (input: string | URL) => {
    asked.push(new URL(String(input), window.location.origin))
    return Promise.resolve(
      new Response('{}', { headers: { 'Content-Type': 'application/json' } })
    )
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('systemDocumentQuery', () => {
  it('keeps a name and language in their query values, whatever they hold', async () => {
    const { queryFn } = systemDocumentQuery('../delete?x=1&y=2', 'a/b#c')
    await (queryFn as () => Promise<unknown>)()
    expect(asked).toHaveLength(1)
    const [address] = asked
    expect(address.pathname).toMatch(/\/-\/system\/document\/get$/)
    expect([...address.searchParams]).toEqual([
      ['name', '../delete?x=1&y=2'],
      ['language', 'a/b#c'],
    ])
    expect(address.hash).toBe('')
  })
})
