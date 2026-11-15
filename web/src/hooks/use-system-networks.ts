// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { SystemHandles, SystemNetworks } from '@/types/networks'
import { requestHelpers } from '@mochi/web'
import endpoints from '@/api/endpoints'
import { fresh } from '@/lib/fresh'

// Each query's options are shared by its hook and the page's loader.
export function systemNetworksQuery() {
  return queryOptions({
    queryKey: ['system', 'networks'],
    queryFn: () =>
      requestHelpers.get<SystemNetworks>(endpoints.system.networks),
    staleTime: fresh.page,
  })
}

export function useSystemNetworks() {
  return useQuery({ ...systemNetworksQuery(), refetchInterval: 5000 })
}

// The page of the registry the handles page opens on, which its loader asks
// for: the first, unsearched.
export const systemHandlesOpening = { limit: 25, offset: 0, search: '' }

// A page of the registry a search matches; the release and takedown
// mutations refresh every page under the same key.
export function systemHandlesQuery(
  limit: number,
  offset: number,
  search: string
) {
  return queryOptions({
    queryKey: ['system', 'handles', limit, offset, search],
    queryFn: () =>
      requestHelpers.post<SystemHandles>(endpoints.system.handlesList, {
        limit,
        offset,
        search,
      }),
    staleTime: fresh.page,
  })
}

export function useSystemHandles(
  limit: number,
  offset: number,
  search: string
) {
  return useQuery(systemHandlesQuery(limit, offset, search))
}

// Replacing a Matrix domain's signing key changes the key the Status page
// shows.
export function useSystemKeyReplace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { domain: string; token: string }) =>
      requestHelpers.post<{ key: string }>(
        endpoints.system.networksKeyReplace,
        data,
        { mochi: { showGlobalErrorToast: false } }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['system', 'networks'] })
    },
  })
}

// Taking a hosted Bluesky account down, or restoring it, changes its status
// in the registry.
export function useSystemAccountTakedown() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { did: string; down: boolean }) =>
      requestHelpers.post(
        endpoints.system.accountTakedown,
        { did: data.did, down: data.down ? 'true' : 'false' },
        { mochi: { showGlobalErrorToast: false } }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['system', 'handles'] })
    },
  })
}

// Releasing a handle changes the registry and, where the handle was the
// owner's own, the Networks page too.
export function useSystemHandleRelease() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; domain: string }) =>
      requestHelpers.post(endpoints.system.handlesRelease, data, {
        mochi: { showGlobalErrorToast: false },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['system', 'handles'] })
      void queryClient.invalidateQueries({ queryKey: ['networks'] })
    },
  })
}
