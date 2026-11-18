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
import { requestHelpers } from '@mochi/web'
import endpoints from '@/api/endpoints'
import { fresh } from '@/lib/fresh'

export type SystemUpdateInfo = {
  available: boolean
  current: string
  latest: string
  platform: string
  track: string
  checked: number
  pending: string
}

// Shared by the hook and the status page's loader.
export function systemUpdateQuery() {
  return queryOptions({
    queryKey: ['system', 'update'],
    queryFn: () =>
      requestHelpers.get<SystemUpdateInfo>(endpoints.system.update),
    staleTime: fresh.page,
  })
}

export function useSystemUpdate() {
  return useQuery(systemUpdateQuery())
}

export function useInstallSystemUpdate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (token: string) => {
      const params = new URLSearchParams({ install: 'true', token })
      return requestHelpers.post(endpoints.system.update, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'update'] })
    },
  })
}
