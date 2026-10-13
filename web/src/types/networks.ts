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
  url?: string
  name?: string
  avatar?: string
  connected?: boolean
  error?: string
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
