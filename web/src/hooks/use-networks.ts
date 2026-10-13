// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { requestHelpers } from '@mochi/web'
import endpoints from '@/api/endpoints'
import type {
  AccountKey,
  Availability,
  NetworkAccount,
  NetworksData,
} from '@/types/networks'

const NO_GLOBAL_ERROR_TOAST_CONFIG = {
  mochi: { showGlobalErrorToast: false },
} as const

export function useNetworksData() {
  return useQuery({
    queryKey: ['networks'],
    queryFn: () => requestHelpers.get<NetworksData>(endpoints.networks.data),
  })
}

// Each change refetches the page's data: a handle reserved, an account made or
// removed, all show up in several places at once.
function useNetworksMutation<T, V>(call: (variables: V) => Promise<T>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: call,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['networks'] })
    },
  })
}

export function useHandleAvailable() {
  return (name: string, domain: string) =>
    requestHelpers.post<Availability>(
      endpoints.networks.handleAvailable,
      { name, domain },
      NO_GLOBAL_ERROR_TOAST_CONFIG
    )
}

export function useHandleReserve() {
  return useNetworksMutation((data: { name: string; domain: string }) =>
    requestHelpers.post(
      endpoints.networks.handleReserve,
      data,
      NO_GLOBAL_ERROR_TOAST_CONFIG
    )
  )
}

export function useHandleRelease() {
  return useNetworksMutation((data: { name: string; domain: string }) =>
    requestHelpers.post(
      endpoints.networks.handleRelease,
      data,
      NO_GLOBAL_ERROR_TOAST_CONFIG
    )
  )
}

export function useAccountCreate() {
  return useNetworksMutation(
    (data: { network: string; handle: string; domain: string }) =>
      requestHelpers.post<NetworkAccount>(
        endpoints.networks.accountCreate,
        data,
        NO_GLOBAL_ERROR_TOAST_CONFIG
      )
  )
}

export function useAccountLink() {
  return useNetworksMutation((data: Record<string, string>) =>
    requestHelpers.post<NetworkAccount & { url?: string }>(
      endpoints.networks.accountLink,
      data,
      NO_GLOBAL_ERROR_TOAST_CONFIG
    )
  )
}

export function useAccountRemove() {
  return useNetworksMutation((id: string) =>
    requestHelpers.post(
      endpoints.networks.accountRemove,
      { id },
      NO_GLOBAL_ERROR_TOAST_CONFIG
    )
  )
}

export function useAccountUpdate() {
  return useNetworksMutation(
    (data: { id: string; label?: string; profile?: boolean }) =>
    requestHelpers.post<NetworkAccount>(
      endpoints.networks.accountUpdate,
      data,
      NO_GLOBAL_ERROR_TOAST_CONFIG
    )
  )
}

export function useAccountTest() {
  return (id: string) =>
    requestHelpers.post<{ success: boolean; message: string }>(
      endpoints.networks.accountTest,
      { id },
      NO_GLOBAL_ERROR_TOAST_CONFIG
    )
}

export function useAccountKeys(id: string | null) {
  return useQuery({
    queryKey: ['networks', 'keys', id],
    queryFn: () =>
      requestHelpers.post<AccountKey[]>(endpoints.networks.accountKeys, { id }),
    enabled: !!id,
  })
}

export function useAccountKeysReplace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      requestHelpers.post(
        endpoints.networks.accountKeysReplace,
        { id },
        NO_GLOBAL_ERROR_TOAST_CONFIG
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['networks', 'keys'] })
    },
  })
}

export function useAccountKeysRecovery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      requestHelpers.post<{ public: string; private: string }>(
        endpoints.networks.accountKeysRecovery,
        { id },
        NO_GLOBAL_ERROR_TOAST_CONFIG
      ),
    // The private half is shown once and never kept, so the result is not
    // retained past the call either.
    gcTime: 0,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['networks', 'keys'] })
    },
  })
}

// A password for signing in to a hosted account from another app, shown once.
export function useAccountPassword() {
  return useMutation({
    mutationFn: (data: { id: string; name: string }) =>
      requestHelpers.post<{ password: string }>(
        endpoints.networks.accountPassword,
        data,
        NO_GLOBAL_ERROR_TOAST_CONFIG
      ),
    gcTime: 0,
  })
}
