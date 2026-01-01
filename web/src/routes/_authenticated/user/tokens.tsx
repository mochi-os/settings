import { createFileRoute } from '@tanstack/react-router'
import { UserTokens } from '@/features/user/tokens'

export const Route = createFileRoute('/_authenticated/user/tokens')({
  component: UserTokens,
})
