import { createFileRoute } from '@tanstack/react-router'
import { UserReplication } from '@/features/user/replication'

export const Route = createFileRoute('/_authenticated/user/replication')({
  component: UserReplication,
})
