import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import endpoints from '@/api/endpoints'
import type { SystemSettingsData } from '@/types/settings'

export function useSystemSettingsData() {
  return useQuery({
    queryKey: ['system', 'settings'],
    queryFn: async () => {
      const response = await apiClient.get<SystemSettingsData>(endpoints.system.settings)
      return response.data
    },
  })
}

export function useSetSystemSetting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; value: string }) => {
      const response = await apiClient.post(endpoints.system.settingsSet, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'settings'] })
    },
  })
}
