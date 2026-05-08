import { createFileRoute } from '@tanstack/react-router'
import { DocumentPage } from '@/features/document/document-page'

export const Route = createFileRoute('/_authenticated/document/terms')({
  component: () => <DocumentPage name='terms' />,
})
