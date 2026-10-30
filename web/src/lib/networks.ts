// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { providerName } from '@mochi/web'

// The networks' names: brand and protocol names, the same in every language.
// A hosted account on the fediverse goes by ActivityPub, the protocol it
// speaks, as Matrix and XMPP do.
export function networkLabel(type: string): string {
  return providerName(type)
}
