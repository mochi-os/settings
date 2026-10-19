// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { Account, ProviderField } from '@mochi/web'

// A hosted or linked account on another network, as mochi.account.list answers
// it: the connected-account fields and what the network adds.
export interface NetworkAccount extends Account {
  hosted?: boolean
  server?: string
  domain?: string
  url?: string
  name?: string
  avatar?: string
  connected?: boolean
  error?: string
  // Shown on the user's profile page, with a rel="me" link.
  profile?: boolean
  // A hosted account fed by sources rather than the person, shown as such on
  // its network.
  automated?: boolean
  // A hosted fediverse account's aliases - the person's other identities,
  // which may move to it - and where it has moved to.
  aliases?: string[]
  moved?: string
  // A hosted Bluesky account's identifier, whether the user has kept a
  // recovery key for it, and the labellers it reads beside the server's.
  did?: string
  recovery?: boolean
  labelers?: string[]
}

// A handle, or a name under one, with the address it has on each network.
export interface Handle {
  domain: string
  name: string
  parent: string
  kind: string
  created: number
  addresses: Record<string, string>
}

export interface Handles {
  handles: Handle[]
  limit: number
  counted: number
  unlimited: boolean
}

// How an existing account on a network is linked: by a form of these fields,
// or by the remote server's consent after they name the server or the handle.
export interface NetworkProvider {
  type: string
  capabilities: string[]
  link: { flow: 'form' | 'oauth'; fields: ProviderField[] }
}

export interface NetworksData {
  offered: boolean
  networks: string[]
  domains: string[]
  handles: Handles
  accounts: NetworkAccount[]
  providers: NetworkProvider[]
  name: string
  // What the user has blocked on other networks - domains and people by
  // their id there - and the people muted.
  blocks?: Block[]
  mutes?: Mute[]
}

export interface Block {
  domain?: string
  actor?: string
  created: number
}

export interface Mute {
  actor: string
  created: number
}

export interface Availability {
  available: boolean
  reason: string
  domain: string
  name: string
}

export interface AccountKey {
  kind: string
  algorithm: string
  public: string
  created: number
}

// The owner's view: each network's state, and every handle with its holder.
export interface NetworkState {
  state: 'working' | 'unavailable' | 'disabled'
  reason: string
  certificates?: { issued: number; limit: number }
  // How much of the relay's budget of events this server has used.
  budget?: {
    hour: { used: number; limit: number }
    day: { used: number; limit: number }
  }
  // The server's standing with the relay: whether it follows this server,
  // and how many accounts it admits.
  relay?: {
    host: string
    status: string
    accounts?: number
    limit?: number
    sequence?: number
  }
  // Each Matrix domain's signing key, by its id.
  keys?: { domain: string; key: string }[]
  // XMPP: each domain's room service, unavailable where its name does not
  // lead to this server.
  rooms?: { host: string; state: 'working' | 'unavailable'; reason: '' | 'dns' }[]
}

export interface SystemNetworks {
  development: boolean
  networks: Record<string, NetworkState>
}

// An account on a handle, as the registry lists it: a Bluesky account has its
// identifier, and its status where the owner has taken it down.
export interface RegistryAccount {
  id: string
  network: string
  identifier: string
  did?: string
  status?: string
}

export interface RegistryHandle extends Handle {
  user: string
  username: string
  holder: string
  accounts?: RegistryAccount[]
}

export interface SystemHandles {
  handles: RegistryHandle[]
  domains: string[]
}
