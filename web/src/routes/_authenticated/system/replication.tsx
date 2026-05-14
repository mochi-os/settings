import { createFileRoute } from '@tanstack/react-router'
import { SystemReplication } from '@/features/system/replication'

export const Route = createFileRoute('/_authenticated/system/replication')({
  component: SystemReplication,
})
