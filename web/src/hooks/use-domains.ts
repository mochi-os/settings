// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  DomainsData,
  DomainDetails,
  UserSearchResult,
  App,
  Entity,
} from '@/types/domains'
import endpoints from '@/api/endpoints'
import { naturalCompare, requestHelpers, useDebounce } from '@mochi/web'

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
      owner: string
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
      owner: string
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

// Debounced inside the hook rather than at the call site: this drives an
// autocomplete, so an undebounced query searches the whole user table on every
// keystroke, and a caller that forgot would reintroduce that silently.
export function useUserSearch(query: string) {
  const debounced = useDebounce(query, 300)
  return useQuery({
    queryKey: ['users', 'search', debounced],
    queryFn: async () => {
      const result = await requestHelpers.get<{ users: UserSearchResult[] }>(
        endpoints.domains.userSearch,
        { params: { query: debounced } }
      )
      return result.users
    },
    enabled: debounced.length >= 2,
  })
}

export function useApps() {
  return useQuery({
    queryKey: ['apps'],
    queryFn: async () => {
      const result = await requestHelpers.get<{ apps: App[] }>(
        endpoints.domains.apps
      )
      return [...result.apps].sort((a, b) => naturalCompare(a.name, b.name))
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
      return [...result.entities].sort((a, b) => naturalCompare(a.name, b.name))
    },
  })
}
