// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { useCallback, useEffect, useRef } from 'react'
import { shellSetLocale, useLocale, type LocalePreferences } from '@mochi/web'

// Sends the shell the whole locale block with one saved key changed. The
// page's own locale only moves once the shell has echoed a change back, so
// two picks saved close together would each start from the block before
// either, and the second would undo the first. Each send therefore starts
// from the last block this page sent, until the shell's echo catches up.
//
// Both callbacks are read when a save resolves, not when it was clicked, so
// they work from refs rather than from the render that made them.
export function useLocaleBroadcast() {
  const { raw: currentLocale } = useLocale()
  const latest = useRef(currentLocale)
  const sent = useRef<LocalePreferences | null>(null)

  useEffect(() => {
    latest.current = currentLocale
    sent.current = null
  }, [currentLocale])

  const send = useCallback((locale: LocalePreferences) => {
    sent.current = locale
    shellSetLocale(locale)
  }, [])

  const change = useCallback(
    (key: keyof LocalePreferences, value: string) =>
      send({ ...(sent.current ?? latest.current), [key]: value }),
    [send]
  )

  return { change, send }
}
