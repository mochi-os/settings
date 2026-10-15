// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { requestHelpers } from '@mochi/web'
import endpoints from '@/api/endpoints'
import type { SystemHandles, SystemNetworks } from '@/types/networks'

export function useSystemNetworks() {
  return useQuery({
    queryKey: ['system', 'networks'],
    queryFn: () =>
      requestHelpers.get<SystemNetworks>(endpoints.system.networks),
    refetchInterval: 5000,
  })
}

export function useSystemHandles() {
  return useQuery({
    queryKey: ['system', 'handles'],
    queryFn: () =>
      requestHelpers.get<SystemHandles>(endpoints.system.handlesList),
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
