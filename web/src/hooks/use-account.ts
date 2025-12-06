import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import endpoints from '@/api/endpoints'
import { requestHelpers } from '@/lib/request'
import type { AccountData, SessionsResponse } from '@/types/account'

export function useAccountData() {
  return useQuery({
    queryKey: ['account', 'data'],
    queryFn: () => requestHelpers.get<AccountData>(endpoints.user.account),
  })
}

export function useSessions() {
  return useQuery({
    queryKey: ['account', 'sessions'],
    queryFn: () =>
      requestHelpers.get<SessionsResponse>(endpoints.user.accountSessions),
  })
}

export function useRevokeSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (code: string) =>
      requestHelpers.post<{ ok: boolean }>(endpoints.user.accountSessionRevoke, {
        code,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account'] })
    },
  })
}
