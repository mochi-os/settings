// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { useMemo, useRef } from 'react'

export interface SaveTicket {
  key: string
  order: number
}

// Two saves of one setting can be answered out of order. Each save takes a
// ticket when it is made, in click order, and runs its effects only if no
// later save of the same setting has run them already, so an older answer
// arriving last cannot undo the newer pick. A refused save never claims, so
// an older accepted one still applies after it.
export function useLatestSave() {
  const counter = useRef(0)
  const applied = useRef(new Map<string, number>())

  return useMemo(
    () => ({
      ticket: (key: string): SaveTicket => ({
        key,
        order: ++counter.current,
      }),
      claim: ({ key, order }: SaveTicket): boolean => {
        if (order < (applied.current.get(key) ?? 0)) return false
        applied.current.set(key, order)
        return true
      },
    }),
    []
  )
}
