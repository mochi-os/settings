import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import endpoints from '@/api/endpoints'
import type {
  SystemDomainsData,
  SystemDomainDetails,
} from '@/types/system-domains'

export function useSystemDomainsData() {
  return useQuery({
    queryKey: ['system', 'domains'],
    queryFn: async () => {
      const response = await apiClient.get<SystemDomainsData>(
        endpoints.system.domains
      )
      return response.data
    },
  })
}

export function useSystemDomainDetails(domain: string) {
  return useQuery({
    queryKey: ['system', 'domains', domain],
    queryFn: async () => {
      const response = await apiClient.get<SystemDomainDetails>(
        endpoints.system.domainsGet,
        { params: { domain } }
      )
      return response.data
    },
    enabled: !!domain,
  })
}

export function useUpdateDomain() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      domain: string
      verified?: string
      tls?: string
    }) => {
      const response = await apiClient.post(endpoints.system.domainsUpdate, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['system', 'domains'] })
      queryClient.invalidateQueries({
        queryKey: ['system', 'domains', variables.domain],
      })
    },
  })
}

export function useDeleteDomain() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (domain: string) => {
      const response = await apiClient.post(endpoints.system.domainsDelete, {
        domain,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'domains'] })
    },
  })
}

export function useCreateDelegation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { domain: string; path: string; owner: number }) => {
      const response = await apiClient.post(
        endpoints.system.domainsDelegationCreate,
        data
      )
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['system', 'domains', variables.domain],
      })
    },
  })
}

export function useDeleteDelegation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { domain: string; path: string; owner: number }) => {
      const response = await apiClient.post(
        endpoints.system.domainsDelegationDelete,
        data
      )
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['system', 'domains', variables.domain],
      })
    },
  })
}
