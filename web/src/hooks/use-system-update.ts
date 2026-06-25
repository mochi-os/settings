// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@mochi/web'
import endpoints from '@/api/endpoints'

const NO_TOAST = { mochi: { showGlobalErrorToast: false } } as const

export type SystemUpdateInfo = {
  available: boolean
  current: string
  latest: string
  platform: string
  track: string
  checked: number
  pending: string
}

export function useSystemUpdate() {
  return useQuery({
    queryKey: ['system', 'update'],
    queryFn: async () => {
      const response = await apiClient.get<SystemUpdateInfo>(endpoints.system.update)
      return response.data
    },
  })
}

export function useInstallSystemUpdate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({ install: 'true' })
      const response = await apiClient.post(endpoints.system.update, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        ...NO_TOAST,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'update'] })
    },
  })
}
