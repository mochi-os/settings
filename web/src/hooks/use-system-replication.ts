import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { requestHelpers } from '@mochi/web'
import endpoints from '@/api/endpoints'

const NO_TOAST = { mochi: { showGlobalErrorToast: false } } as const

export interface PendingJoin {
  peer: string
  label: string
  expires: number
}

export interface BootstrapEntry {
  peer: string
  scope: string
  state: 'queued' | 'active' | 'done'
  position: string
}

export interface ServingEntry {
  peer: string
  scope: string
  started: number
}

export interface OfflineMember {
  peer: string
  since: number
}

export interface SystemReplicationData {
  peer: string
  pair: string[]
  irreparable: string[]
  offline: OfflineMember[]
  joins: PendingJoin[]
  bootstrap: BootstrapEntry[]
  serving: ServingEntry[]
  bootstrap_pending: number
}

// Poll faster while anything is actively changing (bootstrap in flight,
// pending join requests) and slower once the pair has settled. Keeps
// the operator UI responsive during a join+bootstrap (which can run for
// many minutes on the apps scope) without hammering the admin socket
// when nothing's happening.
function systemReplicationInterval(data: SystemReplicationData | undefined): number {
  if (!data) return 2000
  if (data.serving && data.serving.length > 0) return 2000
  if (data.bootstrap.some((b) => b.state !== 'done')) return 2000
  if (data.joins.length > 0) return 2000
  return 15000
}

export function useSystemReplication() {
  return useQuery({
    queryKey: ['system', 'replication'],
    queryFn: () =>
      requestHelpers.get<SystemReplicationData>(endpoints.system.replication),
    refetchInterval: (query) => systemReplicationInterval(query.state.data),
  })
}

export function useApproveJoin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ peer, token }: { peer: string; token: string }) =>
      requestHelpers.post<{ result: string }>(
        endpoints.system.replicationJoinApprove,
        { peer, token },
        NO_TOAST,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['system', 'replication'] }),
  })
}

export function useDenyJoin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (peer: string) =>
      requestHelpers.post<{ result: string }>(
        endpoints.system.replicationJoinDeny,
        { peer },
        NO_TOAST,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['system', 'replication'] }),
  })
}

export function useRemovePair() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (peer: string) =>
      requestHelpers.post<{ result: string }>(
        endpoints.system.replicationPairRemove,
        { peer },
        NO_TOAST,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['system', 'replication'] }),
  })
}
