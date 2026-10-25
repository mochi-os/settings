// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

// Someone in a report: their address on their network, the name they are
// shown by, whether they can be blocked, and the other server they are on.
export interface ReportParty {
  id: string
  name: string
  blockable: boolean
  host: string
}

export type ReportOutcome = 'dismissed' | 'blocked' | 'suspended'

export interface Report {
  id: string
  network: string
  reporter: ReportParty
  person: ReportParty | null
  user: string
  account?: { username: string; status: string }
  room: { id: string; name: string } | null
  objects: string[]
  category: string
  comment: string
  content: string
  created: number
  resolved: number
  outcome: ReportOutcome | ''
}

export interface SystemReports {
  reports: Report[]
}

export interface SystemBlocks {
  domains: { domain: string; created: number }[]
  people: { actor: string; created: number }[]
}

export interface FediverseHost {
  host: string
  failures: number
  success: number
  failure: number
  next: number
  error: string
  waiting: number
  limited: boolean
}

export interface MatrixHost {
  server: string
  failures: number
  next: number
  waiting: number
}

export interface XmppLink {
  server: string
  domain: string
  up: boolean
  failures: number
  next: number
  waiting: number
}

export interface SystemHosts {
  fediverse: FediverseHost[]
  matrix: MatrixHost[]
  xmpp: {
    links: XmppLink[]
    sessions: { clients: number; accounts: number }
  }
}
