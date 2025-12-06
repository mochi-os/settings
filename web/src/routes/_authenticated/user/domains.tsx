import { createFileRoute } from '@tanstack/react-router'
import { UserDomains } from '@/features/user/domains'

export const Route = createFileRoute('/_authenticated/user/domains')({
  component: UserDomains,
})
