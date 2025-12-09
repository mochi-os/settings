import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/user/preferences')({
  beforeLoad: () => {
    throw redirect({ to: '/user', search: { tab: 'preferences' } })
  },
})
