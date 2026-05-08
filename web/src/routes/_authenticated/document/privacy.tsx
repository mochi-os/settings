import { createFileRoute } from '@tanstack/react-router'
import { DocumentPage } from '@/features/document/document-page'

export const Route = createFileRoute('/_authenticated/document/privacy')({
  component: () => <DocumentPage name='privacy' />,
})
