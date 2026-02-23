import { createFileRoute } from '@tanstack/react-router'
import { UserInterests } from '@/features/user/interests'

export const Route = createFileRoute('/_authenticated/user/interests')({
  component: UserInterests,
})
