import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { requestHelpers } from '@mochi/web'
import endpoints from '@/api/endpoints'

const NO_TOAST = { mochi: { showGlobalErrorToast: false } } as const

export interface ReplicationLink {
  peer: string
  label: string
  expires: number
}

export interface ReplicationHost {
  peer: string
  added: number
  ack: number
}

export interface ReplicationData {
  links: ReplicationLink[]
  hosts: ReplicationHost[]
}

export function useReplication() {
  return useQuery({
    queryKey: ['replication', 'user'],
    queryFn: () =>
      requestHelpers.get<ReplicationData>(endpoints.user.replication),
  })
}

export function useApproveLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (peer: string) =>
      requestHelpers.post<{ result: string }>(
        endpoints.user.replicationApprove,
        { peer },
        NO_TOAST,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['replication'] }),
  })
}

export function useDenyLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (peer: string) =>
      requestHelpers.post<{ result: string }>(
        endpoints.user.replicationDeny,
        { peer },
        NO_TOAST,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['replication'] }),
  })
}

export function useRemoveHost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (peer: string) =>
      requestHelpers.post<{ result: string }>(
        endpoints.user.replicationRemove,
        { peer },
        NO_TOAST,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['replication'] }),
  })
}
