// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@mochi/web'
import endpoints from '@/api/endpoints'

export interface SystemDocument {
  name: string
  language: string
  body: string
  default: string
  updated: number
}

interface SystemDocumentsData {
  documents: SystemDocument[]
}

export function useSystemDocumentsData() {
  return useQuery({
    queryKey: ['system', 'documents'],
    queryFn: async () => {
      const response = await apiClient.get<SystemDocumentsData>(endpoints.system.documents)
      return response.data
    },
  })
}

export function useSetSystemDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; language: string; body: string }) => {
      const response = await apiClient.post(endpoints.system.documentSet, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'documents'] })
    },
  })
}
