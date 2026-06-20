// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { createFileRoute } from '@tanstack/react-router'
import { SystemDocuments } from '@/features/system/documents'

type DocumentName = 'rules' | 'terms' | 'privacy'

interface DocumentsSearch {
  tab?: DocumentName
  language?: string
}

export const Route = createFileRoute('/_authenticated/system/documents')({
  validateSearch: (search: Record<string, unknown>): DocumentsSearch => ({
    tab:
      search.tab === 'rules' || search.tab === 'terms' || search.tab === 'privacy'
        ? search.tab
        : undefined,
    language: typeof search.language === 'string' ? search.language : undefined,
  }),
  component: SystemDocuments,
})
