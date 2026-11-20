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

// The provider an existing account on a network is linked through, where it
// is not the network's own name: a fediverse account by Mastodon's.
const linkedThrough: Record<string, string> = { fediverse: 'mastodon' }

// The id of the switch that makes a handle's account on a network.
export function networkSwitchId(
  handle: { domain: string; name: string },
  network: string
): string {
  return `network-${handle.domain}-${handle.name}-${network}`
}

// Where the page takes someone an app sent to set up a network: to the switch
// that makes the account on their first handle, to the handle field when
// they have none yet, or to the link form of the provider an account there
// is linked through, where the server hosts no accounts on that network.
export type Arrival =
  | { kind: 'switch'; id: string }
  | { kind: 'handle' }
  | { kind: 'link'; type: string }
  | null

export function arrival(
  network: string | null,
  networks: string[],
  providers: { type: string }[],
  first: { domain: string; name: string } | undefined
): Arrival {
  if (!network) return null
  if (networks.includes(network)) {
    return first
      ? { kind: 'switch', id: networkSwitchId(first, network) }
      : { kind: 'handle' }
  }
  const type = linkedThrough[network] ?? network
  return providers.some((p) => p.type === type) ? { kind: 'link', type } : null
}
