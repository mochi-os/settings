import { createFileRoute } from '@tanstack/react-router'
import { ConnectedAccounts } from '@/features/user/connected-accounts'

export const Route = createFileRoute('/_authenticated/user/accounts')({
  component: ConnectedAccounts,
})
