import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/user/account')({
  beforeLoad: () => {
    throw redirect({ to: '/user', search: { tab: 'account' } })
  },
})
