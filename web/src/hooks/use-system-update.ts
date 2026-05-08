import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@mochi/web'
import endpoints from '@/api/endpoints'

export type SystemUpdateInfo = {
  available: boolean
  current: string
  latest: string
  platform: string
  track: string
  checked: number
  pending: string
}

export function useSystemUpdate() {
  return useQuery({
    queryKey: ['system', 'update'],
    queryFn: async () => {
      const response = await apiClient.get<SystemUpdateInfo>(endpoints.system.update)
      return response.data
    },
  })
}

export function useInstallSystemUpdate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({ install: 'true' })
      const response = await apiClient.post(endpoints.system.update, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'update'] })
    },
  })
}
