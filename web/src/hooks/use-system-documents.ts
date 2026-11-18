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
interface SystemDocumentEntry {
  name: string
  language: string
}

interface SystemDocumentsData {
  documents: SystemDocumentEntry[]
}

// Each query's options are shared by its hook and the documents page's loader.
export function systemDocumentsQuery() {
  return queryOptions({
    queryKey: ['system', 'documents'],
    queryFn: () =>
      requestHelpers.get<SystemDocumentsData>(endpoints.system.documents),
    staleTime: fresh.page,
  })
}

export function useSystemDocumentsData() {
  return useQuery(systemDocumentsQuery())
}

// The language a document opens in when the address names none: the
// interface's, where that document has it, else English. Undefined while that
// turns on an index not yet loaded, so neither the page nor its loader asks
// for a document it will not show.
export function systemDocumentLanguage(
  documents: SystemDocumentEntry[] | undefined,
  name: string,
  locale: string | undefined
): string | undefined {
  const language = locale?.split('-')[0]?.toLowerCase() || 'en'
  if (language === 'en') return 'en'
  if (!documents) return undefined
  return documents.some(
    (entry) => entry.name === name && entry.language === language
  )
    ? language
    : 'en'
}

// Fetches the one document being edited. Keyed on the pair so switching
// language or tab fetches that document rather than re-reading the whole set.
export function systemDocumentQuery(name: string, language: string) {
  return queryOptions({
    queryKey: ['system', 'document', name, language],
    queryFn: () =>
      requestHelpers.get<SystemDocument>(
        `${endpoints.system.documentGet}?name=${encodeURIComponent(name)}&language=${encodeURIComponent(language)}`
      ),
    staleTime: fresh.page,
  })
}

export function useSystemDocument(name: string, language: string) {
  return useQuery({
    ...systemDocumentQuery(name, language),
    enabled: Boolean(name && language),
  })
}

export function useSetSystemDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      name: string
      language: string
      body: string
      token: string
    }) => requestHelpers.post(endpoints.system.documentSet, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['system', 'documents'] })
      queryClient.invalidateQueries({
        queryKey: ['system', 'document', variables.name, variables.language],
      })
    },
  })
}
