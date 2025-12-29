import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { requestHelpers } from '@mochi/common'
import endpoints from '@/api/endpoints'

interface AppInfo {
  id: string
  label: string
  version: string
  versions: string[]
  classes?: string[]
  services?: string[]
  paths?: string[]
}

interface VersionPreference {
  version?: string
  track?: string
}

interface UserAppsData {
  apps: AppInfo[]
  versions: Record<string, VersionPreference>
  classes: Record<string, string>
  services: Record<string, string>
  paths: Record<string, string>
}

export const useUserAppsData = () => {
  return useQuery({
    queryKey: ['user', 'apps'],
    queryFn: async () => {
      return requestHelpers.get<UserAppsData>(endpoints.user.apps)
    },
  })
}

export const useSetUserAppVersion = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: { app: string; version?: string; track?: string }) => {
      return requestHelpers.post<{ ok: boolean }>(endpoints.user.appsVersionSet, params)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'apps'] })
    },
  })
}

export const useSetUserAppRouting = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: { type: string; name: string; app?: string }) => {
      return requestHelpers.post<{ ok: boolean }>(endpoints.user.appsRoutingSet, params)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'apps'] })
    },
  })
}

export const useResetUserApps = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      return requestHelpers.post<{ ok: boolean }>(endpoints.user.appsReset, {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'apps'] })
    },
  })
}
