import { createFileRoute } from '@tanstack/react-router'
import { DocumentPage } from '@/features/document/document-page'

export const Route = createFileRoute('/_authenticated/document/rules')({
  component: () => <DocumentPage name='rules' />,
})
