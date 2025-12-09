import { createFileRoute } from '@tanstack/react-router'
import { UserSettings } from '@/features/user/settings'

type UserSettingsSearch = {
  tab?: string
}

export const Route = createFileRoute('/_authenticated/user/')({
  validateSearch: (search: Record<string, unknown>): UserSettingsSearch => {
    return {
      tab: typeof search.tab === 'string' ? search.tab : undefined,
    }
  },
  component: function UserSettingsPage() {
    const { tab } = Route.useSearch()
    return <UserSettings defaultTab={tab || 'account'} />
  },
})
