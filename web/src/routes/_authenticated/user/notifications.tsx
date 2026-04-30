import { createFileRoute } from '@tanstack/react-router'
import { UserNotifications } from '@/features/user/notifications'

type TabId = 'categories' | 'topics'

type NotificationsSearch = {
  tab?: TabId
}

export const Route = createFileRoute('/_authenticated/user/notifications')({
  validateSearch: (search: Record<string, unknown>): NotificationsSearch => ({
    tab: search.tab === 'categories' || search.tab === 'topics' ? search.tab : undefined,
  }),
  component: UserNotifications,
})
