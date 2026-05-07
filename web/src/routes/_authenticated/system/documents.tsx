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
