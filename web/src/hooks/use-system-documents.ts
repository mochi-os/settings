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

// The index carries no bodies. Every (name x language) pair the server ships
// is listed so the language picker can be built, but the page only ever
// displays one of them, and the full set is ~4 MB of Markdown.
export interface SystemDocumentEntry {
  name: string
  language: string
}

interface SystemDocumentsData {
  documents: SystemDocumentEntry[]
}

export function useSystemDocumentsData() {
  return useQuery({
    queryKey: ['system', 'documents'],
    queryFn: () =>
      requestHelpers.get<SystemDocumentsData>(endpoints.system.documents),
  })
}

// Fetches the one document being edited. Keyed on the pair so switching
// language or tab fetches that document rather than re-reading the whole set.
export function useSystemDocument(name: string, language: string) {
  return useQuery({
    queryKey: ['system', 'document', name, language],
    queryFn: () =>
      requestHelpers.get<SystemDocument>(
        `${endpoints.system.documentGet}?name=${encodeURIComponent(name)}&language=${encodeURIComponent(language)}`
      ),
    enabled: Boolean(name && language),
  })
}

export function useSetSystemDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; language: string; body: string }) =>
      requestHelpers.post(endpoints.system.documentSet, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['system', 'documents'] })
      queryClient.invalidateQueries({
        queryKey: ['system', 'document', variables.name, variables.language],
      })
    },
  })
}
