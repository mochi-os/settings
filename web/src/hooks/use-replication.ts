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

// Poll faster while pending link-requests are visible so an Approve /
// Deny click from the other side reflects on this page quickly; slow
// down once the table is settled.
function userReplicationInterval(data: ReplicationData | undefined): number {
  if (!data) return 2000
  if (data.links.length > 0) return 2000
  return 15000
}

export function useReplication() {
  return useQuery({
    queryKey: ['replication', 'user'],
    queryFn: () =>
      requestHelpers.get<ReplicationData>(endpoints.user.replication),
    refetchInterval: (query) => userReplicationInterval(query.state.data),
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
