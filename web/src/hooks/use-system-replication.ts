import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { requestHelpers } from '@mochi/web'
import endpoints from '@/api/endpoints'

const NO_TOAST = { mochi: { showGlobalErrorToast: false } } as const

export interface PendingJoin {
  peer: string
  label: string
  expires: number
}

export interface SystemReplicationData {
  peer: string
  pair: string[]
  joins: PendingJoin[]
}

export function useSystemReplication() {
  return useQuery({
    queryKey: ['system', 'replication'],
    queryFn: () =>
      requestHelpers.get<SystemReplicationData>(endpoints.system.replication),
  })
}

export function useApproveJoin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (peer: string) =>
      requestHelpers.post<{ result: string }>(
        endpoints.system.replicationJoinApprove,
        { peer },
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
