// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

export interface Domain {
  domain: string
  verified: number
  token: string
  tls: number
  // Whether a certificate was installed by hand for this domain. It overrides
  // tls entirely, so this is what decides whether switching automatic
  // certificates off costs anything.
  certificate: boolean
  // Whether the server could actually present a certificate for this domain
  // today. Not derivable here: it also depends on the verification policy and
  // on ACME being configured, neither of which the client sees.
  https: boolean
  created: number
  updated: number
}

export interface Route {
  domain: string
  path: string
  method: string
  target: string
  context: string
  priority: number
  enabled: number
  created: number
  updated: number
  target_name?: string
}

export interface Entity {
  id: string
  fingerprint: string
  class: string
  name: string
}

export interface Delegation {
  id: number
  domain: string
  path: string
  // Text uid. Core replaced the integer users.id with a uid, so there is no
  // numeric owner and mochi.user.search returns no `id` field at all.
  owner: string
  username: string
  created: number
  updated: number
}

export interface UserSearchResult {
  uid: string
  username: string
  role: string
}

export interface DomainsData {
  domains: Domain[]
  delegations?: Delegation[]
  count: number
  admin: boolean
}

export interface DomainDetails {
  domain: Domain
  routes: Route[]
  delegations: Delegation[]
  admin: boolean
}

export interface App {
  id: string
  name: string
  latest: string
}
