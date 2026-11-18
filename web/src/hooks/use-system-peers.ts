// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { queryOptions, useQuery } from '@tanstack/react-query'
import { requestHelpers } from '@mochi/web'
import endpoints from '@/api/endpoints'
import { fresh } from '@/lib/fresh'

export interface PeerEntry {
  peer: string
  name: string
  fingerprint: string
  connected: boolean
  unreachable: boolean
  address: string
  seen: number
  addresses: number
  queued: number
  oldest: number
}

interface NetworkInfo {
  reachability: 'public' | 'private' | 'unknown'
  relay: boolean
  mesh: number
  last: number
  queued: number
  unresolved: number
  holepunch: { success: number; failure: number }
  relaying: {
    active: boolean
    reservations: { held: number; maximum: number }
    circuits: number
    rejected: number
  }
}

interface ServerCounts {
  users: number
  entities: number
}

interface SystemPeersData {
  peers: PeerEntry[]
  network: NetworkInfo
  counts: ServerCounts
}

// Shared by the hook and the status page's loader.
export function systemPeersQuery() {
  return queryOptions({
    queryKey: ['system', 'peers'],
    queryFn: () => requestHelpers.get<SystemPeersData>(endpoints.system.peers),
    staleTime: fresh.page,
  })
}

export function useSystemPeers() {
  return useQuery({ ...systemPeersQuery(), refetchInterval: 5000 })
}
