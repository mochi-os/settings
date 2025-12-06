import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import endpoints from '@/api/endpoints'
import type { UserDomainsData, RoutesData } from '@/types/domains'

export function useUserDomainsData() {
  return useQuery({
    queryKey: ['user', 'domains'],
    queryFn: async () => {
      const response = await apiClient.get<UserDomainsData>(endpoints.user.domains)
      return response.data
    },
  })
}

export function useDomainRoutes(domain: string) {
  return useQuery({
    queryKey: ['user', 'domains', 'routes', domain],
    queryFn: async () => {
      const response = await apiClient.get<RoutesData>(endpoints.user.domainsRoutes, {
        params: { domain },
      })
      return response.data
    },
    enabled: !!domain,
  })
}

export function useSetRoute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      domain: string
      path: string
      entity: string
      priority?: number
      context?: string
    }) => {
      const response = await apiClient.post(endpoints.user.domainsRouteSet, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['user', 'domains', 'routes', variables.domain],
      })
    },
  })
}

export function useDeleteRoute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { domain: string; path: string }) => {
      const response = await apiClient.post(endpoints.user.domainsRouteDelete, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['user', 'domains', 'routes', variables.domain],
      })
    },
  })
}
