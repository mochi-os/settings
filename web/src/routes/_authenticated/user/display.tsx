import { createFileRoute } from '@tanstack/react-router'
import { UserDisplay } from '@/features/user/display'

export const Route = createFileRoute('/_authenticated/user/display')({
  component: UserDisplay,
})
