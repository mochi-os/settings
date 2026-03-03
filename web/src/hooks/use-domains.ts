import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  DomainsData,
  DomainDetails,
  UserSearchResult,
  App,
  Entity,
} from '@/types/domains'
import endpoints from '@/api/endpoints'
import { requestHelpers } from '@mochi/common'

const NO_GLOBAL_ERROR_TOAST_CONFIG = {
  mochi: { showGlobalErrorToast: false },
} as const

export function useDomainsData() {
  return useQuery({
    queryKey: ['domains'],
    queryFn: () => requestHelpers.get<DomainsData>(endpoints.domains.data),
  })
}

export function useCreateDomain() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (domain: string) =>
      requestHelpers.post(
        endpoints.domains.create,
        { domain },
        NO_GLOBAL_ERROR_TOAST_CONFIG
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] })
    },
  })
}

export function useDomainDetails(domain: string) {
  return useQuery({
    queryKey: ['domains', domain],
    queryFn: () =>
      requestHelpers.get<DomainDetails>(endpoints.domains.get, {
        params: { domain },
      }),
    enabled: !!domain,
  })
}

export function useUpdateDomain() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      domain: string
      verified?: boolean
      tls?: boolean
    }) =>
      requestHelpers.post(
        endpoints.domains.update,
        data,
        NO_GLOBAL_ERROR_TOAST_CONFIG
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['domains'] })
      queryClient.invalidateQueries({ queryKey: ['domains', variables.domain] })
    },
  })
}

export function useDeleteDomain() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (domain: string) =>
      requestHelpers.post(
        endpoints.domains.delete,
        { domain },
        NO_GLOBAL_ERROR_TOAST_CONFIG
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] })
    },
  })
}

export function useVerifyDomain() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (domain: string) =>
      requestHelpers.post<{ verified: boolean }>(
        endpoints.domains.verify,
        { domain },
        NO_GLOBAL_ERROR_TOAST_CONFIG
      ),
    onSuccess: (_, domain) => {
      queryClient.invalidateQueries({ queryKey: ['domains'] })
      queryClient.invalidateQueries({ queryKey: ['domains', domain] })
    },
  })
}

export function useCreateRoute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      domain: string
      path: string
      method: string
      target: string
      priority?: number
      context?: string
    }) =>
      requestHelpers.post(
        endpoints.domains.routeCreate,
        data,
        NO_GLOBAL_ERROR_TOAST_CONFIG
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['domains', variables.domain] })
    },
  })
}

export function useUpdateRoute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      domain: string
      path: string
      method?: string
      target?: string
      priority?: number
      enabled?: boolean
    }) =>
      requestHelpers.post(
        endpoints.domains.routeUpdate,
        data,
        NO_GLOBAL_ERROR_TOAST_CONFIG
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['domains', variables.domain] })
    },
  })
}

export function useDeleteRoute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { domain: string; path: string }) =>
      requestHelpers.post(
        endpoints.domains.routeDelete,
        data,
        NO_GLOBAL_ERROR_TOAST_CONFIG
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['domains', variables.domain] })
    },
  })
}

export function useCreateDelegation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      domain: string
      path: string
      owner: number
    }) =>
      requestHelpers.post(
        endpoints.domains.delegationCreate,
        data,
        NO_GLOBAL_ERROR_TOAST_CONFIG
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['domains', variables.domain] })
    },
  })
}

export function useDeleteDelegation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      domain: string
      path: string
      owner: number
    }) =>
      requestHelpers.post(
        endpoints.domains.delegationDelete,
        data,
        NO_GLOBAL_ERROR_TOAST_CONFIG
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['domains', variables.domain] })
    },
  })
}

export function useUserSearch(query: string) {
  return useQuery({
    queryKey: ['users', 'search', query],
    queryFn: async () => {
      const result = await requestHelpers.get<{ users: UserSearchResult[] }>(
        endpoints.domains.userSearch,
        { params: { query } }
      )
      return result.users
    },
    enabled: query.length >= 2,
  })
}

export function useApps() {
  return useQuery({
    queryKey: ['apps'],
    queryFn: async () => {
      const result = await requestHelpers.get<{ apps: App[] }>(
        endpoints.domains.apps
      )
      return result.apps
    },
  })
}

export function useEntities() {
  return useQuery({
    queryKey: ['entities'],
    queryFn: async () => {
      const result = await requestHelpers.get<{ entities: Entity[] }>(
        endpoints.domains.entities
      )
      return result.entities
    },
  })
}
