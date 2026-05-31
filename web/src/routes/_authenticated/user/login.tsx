import { createFileRoute } from '@tanstack/react-router'
import { UserLogin } from '@/features/user/login'

export const Route = createFileRoute('/_authenticated/user/login')({
  component: UserLogin,
})
