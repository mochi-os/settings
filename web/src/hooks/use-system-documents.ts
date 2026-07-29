// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { requestHelpers } from '@mochi/web'
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
    queryFn: () =>
      requestHelpers.get<SystemDocumentsData>(endpoints.system.documents),
  })
}

export function useSetSystemDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; language: string; body: string }) =>
      requestHelpers.post(endpoints.system.documentSet, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'documents'] })
    },
  })
}
