import { createFileRoute } from '@tanstack/react-router'
import { UserApps } from '@/features/user/apps'

export const Route = createFileRoute('/_authenticated/user/apps')({
  component: UserApps,
})
