// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { providerName } from '@mochi/web'

// The networks' names. The fediverse is a common noun the languages make their
// own; XMPP is an initialism the provider naming would miscase; the rest are
// brands the library capitalises.
export function networkLabel(type: string): string {
  switch (type) {
    case 'fediverse':
      return i18n._(msg`Fediverse`)
    case 'xmpp':
      return i18n._(msg`XMPP`)
  }
  return providerName(type)
}
