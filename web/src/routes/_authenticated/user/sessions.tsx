import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/user/sessions')({
  beforeLoad: () => {
    throw redirect({ to: '/user', search: { tab: 'sessions' } })
  },
})
