import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AppsListData,
  AppDetailData,
  AppsAvailableData,
  AppsRoutingData,
} from '@/types/apps'
import endpoints from '@/api/endpoints'
import { apiClient } from '@mochi/common'

export function useAppsAvailable() {
  return useQuery({
    queryKey: ['system', 'apps', 'available'],
    queryFn: async () => {
      const response = await apiClient.get<AppsAvailableData>(
        endpoints.system.appsAvailable
      )
      return response.data
    },
  })
}

export function useAppsList() {
  return useQuery({
    queryKey: ['system', 'apps', 'list'],
    queryFn: async () => {
      const response = await apiClient.get<AppsListData>(
        endpoints.system.appsList
      )
      return response.data
    },
  })
}

export function useAppDetail(appId: string) {
  return useQuery({
    queryKey: ['system', 'apps', 'detail', appId],
    queryFn: async () => {
      const response = await apiClient.get<AppDetailData>(
        endpoints.system.appsGet,
        { params: { app: appId } }
      )
      return response.data
    },
    enabled: !!appId,
  })
}

export function useAppsRouting() {
  return useQuery({
    queryKey: ['system', 'apps', 'routing'],
    queryFn: async () => {
      const response = await apiClient.get<AppsRoutingData>(
        endpoints.system.appsRouting
      )
      return response.data
    },
  })
}

export function useSetAppVersion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { app: string; version?: string; track?: string }) => {
      const response = await apiClient.post(endpoints.system.appsVersionSet, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'apps'] })
    },
  })
}

export function useSetAppTrack() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { app: string; track: string; version: string }) => {
      const response = await apiClient.post(endpoints.system.appsTrackSet, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'apps'] })
    },
  })
}

export function useSetAppRouting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { type: 'class' | 'service' | 'path'; name: string; app?: string }) => {
      const response = await apiClient.post(endpoints.system.appsRoutingSet, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'apps', 'routing'] })
    },
  })
}

export function useAppsCleanup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<{ removed: number }>(
        endpoints.system.appsCleanup
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'apps'] })
    },
  })
}
