// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { createFileRoute } from '@tanstack/react-router'
import { i18n } from '@lingui/core'
import {
  systemDocumentLanguage,
  systemDocumentQuery,
  systemDocumentsQuery,
} from '@/hooks/use-system-documents'
import { SystemDocuments } from '@/features/system/documents'

type DocumentName = 'rules' | 'terms' | 'privacy'

interface DocumentsSearch {
  tab?: DocumentName
  language?: string
}

export const Route = createFileRoute('/_authenticated/system/documents')({
  validateSearch: (search: Record<string, unknown>): DocumentsSearch => ({
    tab:
      search.tab === 'rules' ||
      search.tab === 'terms' ||
      search.tab === 'privacy'
        ? search.tab
        : undefined,
    language: typeof search.language === 'string' ? search.language : undefined,
  }),
  // The index, and the document on screen, asked for beside the route's code
  // rather than once the page has mounted. Not awaited: the page's hooks join
  // them. The document's language, when the address names none, is read as
  // the page reads it, from the index where it turns on that.
  loaderDeps: ({ search }) => ({ tab: search.tab, language: search.language }),
  loader: ({ context, deps }) => {
    const { queryClient } = context
    const tab = deps.tab ?? 'rules'
    const index = queryClient.prefetchQuery(systemDocumentsQuery())
    const language = (documents?: { name: string; language: string }[]) =>
      deps.language ?? systemDocumentLanguage(documents, tab, i18n.locale)
    const known = language()
    if (known) {
      void queryClient.prefetchQuery(systemDocumentQuery(tab, known))
      return
    }
    void index.then(() => {
      const documents = queryClient.getQueryData(
        systemDocumentsQuery().queryKey
      )?.documents
      const resolved = language(documents)
      if (resolved) {
        void queryClient.prefetchQuery(systemDocumentQuery(tab, resolved))
      }
    })
  },
  component: SystemDocuments,
})
