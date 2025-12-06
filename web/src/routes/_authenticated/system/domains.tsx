import { createFileRoute } from '@tanstack/react-router'
import { SystemDomains } from '@/features/system/domains'

export const Route = createFileRoute('/_authenticated/system/domains')({
  component: SystemDomains,
})
