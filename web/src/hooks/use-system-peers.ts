import { useQuery } from '@tanstack/react-query'
import { requestHelpers } from '@mochi/web'
import endpoints from '@/api/endpoints'

export interface PeerEntry {
  peer: string
  connected: boolean
  unreachable: boolean
  address: string
  seen: number
  addresses: number
  queued: number
  oldest: number
}

export interface NetworkInfo {
  reachability: 'public' | 'private' | 'unknown'
  relay: boolean
  mesh: number
  last: number
  queued: number
}

export interface ServerCounts {
  users: number
  entities: number
}

export interface SystemPeersData {
  peers: PeerEntry[]
  network: NetworkInfo
  counts: ServerCounts
}

export function useSystemPeers() {
  return useQuery({
    queryKey: ['system', 'peers'],
    queryFn: () => requestHelpers.get<SystemPeersData>(endpoints.system.peers),
    refetchInterval: 5000,
  })
}
