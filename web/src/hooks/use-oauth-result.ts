// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { useEffect } from 'react'
import { useLingui } from '@lingui/react/macro'
import { providerName, toast } from '@mochi/web'
import type { OAuthProvider } from '@/types/account'

// The providers a sign-in can be linked with, in the order they are offered.
export const OAUTH_PROVIDERS: OAuthProvider[] = [
  'facebook',
  'github',
  'google',
  'microsoft',
  'x',
]

// Suppresses the one-shot toast on React StrictMode's double mount. Module
// scope, not sessionStorage: the shell iframe partitions storage per load.
const shown = new Set<string>()

// A provider returns the browser to the page that started a link with
// oauth_linked or oauth_error on the query; say once how it went.
export function useOauthResult() {
  const { t } = useLingui()
  useEffect(() => {
    const key = window.location.search
    if (shown.has(key)) return
    const params = new URLSearchParams(key)
    const linked = params.get('oauth_linked')
    const errored = params.get('oauth_error')
    if (!linked && !errored) return
    shown.add(key)

    // Deferred a tick: the toaster subscribes in a sibling effect, and a
    // message published before it has is dropped.
    setTimeout(() => {
      if (linked) {
        // Only a known provider is named: `linked` is a query parameter, so
        // falling back to it would put attacker-chosen text in a toast the
        // page presents as its own result.
        const label = OAUTH_PROVIDERS.includes(linked as OAuthProvider)
          ? providerName(linked)
          : undefined
        toast.success(label ? t`Linked ${label}` : t`Account linked`)
      } else if (errored === 'already_linked') {
        toast.error(t`That account is already linked to another user`)
      } else if (errored === 'email_exists') {
        toast.error(t`That email is already registered to another account`)
      } else {
        toast.error(t`Could not link account`)
      }
    }, 0)
  }, [t])
}
