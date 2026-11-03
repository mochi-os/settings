// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useLatestSave } from './use-latest-save'

// Saves of one setting can be answered in any order. Only the newest pick
// that has been answered may apply, so the last pick always wins.
describe('useLatestSave', () => {
  it('lets the last of three picks win whatever order they are answered in', () => {
    const { result } = renderHook(() => useLatestSave())
    const latest = result.current
    const first = latest.ticket('language')
    const second = latest.ticket('language')
    const third = latest.ticket('language')
    expect(latest.claim(third)).toBe(true)
    expect(latest.claim(first)).toBe(false)
    expect(latest.claim(second)).toBe(false)
  })

  it('applies each pick answered in click order', () => {
    const { result } = renderHook(() => useLatestSave())
    const latest = result.current
    const tickets = ['fr', 'de', 'en'].map(() => latest.ticket('language'))
    expect(tickets.map((ticket) => latest.claim(ticket))).toEqual([
      true,
      true,
      true,
    ])
  })

  it('still applies an older pick when the newer one was refused', () => {
    const { result } = renderHook(() => useLatestSave())
    const latest = result.current
    const older = latest.ticket('maps')
    latest.ticket('maps') // refused: never claims
    expect(latest.claim(older)).toBe(true)
  })

  it('keeps settings apart', () => {
    const { result } = renderHook(() => useLatestSave())
    const latest = result.current
    const maps = latest.ticket('maps')
    const flights = latest.ticket('flights')
    expect(latest.claim(flights)).toBe(true)
    expect(latest.claim(maps)).toBe(true)
  })

  it('keeps its count across renders', () => {
    const { result, rerender } = renderHook(() => useLatestSave())
    const older = result.current.ticket('units')
    rerender()
    const newer = result.current.ticket('units')
    expect(result.current.claim(newer)).toBe(true)
    expect(result.current.claim(older)).toBe(false)
  })
})
