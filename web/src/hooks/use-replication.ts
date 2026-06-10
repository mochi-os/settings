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
  irreparable: boolean
  offline: number
}

export interface ReplicationData {
  user?: { username: string }
  server?: { id: string }
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
    mutationFn: ({ peer, token }: { peer: string; token: string }) =>
      requestHelpers.post<{ result: string }>(
        endpoints.user.replicationApprove,
        { peer, token },
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

// Forget an unreachable host (advanced). Removes a named remote host from the
// set and tells it to purge. Step-up gated.
export function useRemoveHost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ peer, token }: { peer: string; token: string }) =>
      requestHelpers.post<{ result: string }>(
        endpoints.user.replicationRemove,
        { peer, token },
        NO_TOAST,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['replication'] }),
  })
}

// Remove the account from THIS server (leave the replica set). Purges the
// local copy; the account survives on the user's other servers. Step-up gated;
// the user is signed out afterwards (this server's copy is gone).
export function useLeaveServer() {
  return useMutation({
    mutationFn: ({ token }: { token: string }) =>
      requestHelpers.post<{ ok: boolean }>(
        endpoints.user.replicationLeave,
        { token },
        NO_TOAST,
      ),
  })
}
