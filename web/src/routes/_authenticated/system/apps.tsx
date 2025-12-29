import { createFileRoute } from '@tanstack/react-router'
import { SystemApps } from '@/features/system/apps'

export const Route = createFileRoute('/_authenticated/system/apps')({
  component: SystemApps,
})
