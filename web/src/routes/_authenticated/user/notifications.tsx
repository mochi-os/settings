// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { createFileRoute } from '@tanstack/react-router'
import {
  notificationCategoriesQuery,
  notificationTopicsQuery,
} from '@/hooks/use-notifications'
import { UserNotifications } from '@/features/user/notifications'

type TabId = 'categories' | 'topics'

type NotificationsSearch = {
  tab?: TabId
}

export const Route = createFileRoute('/_authenticated/user/notifications')({
  validateSearch: (search: Record<string, unknown>): NotificationsSearch => ({
    tab:
      search.tab === 'categories' || search.tab === 'topics'
        ? search.tab
        : undefined,
  }),
  // The page's data, asked for beside the route's code rather than once the
  // page has mounted. Not awaited: the page's hooks join it.
  loaderDeps: ({ search }) => ({ tab: search.tab }),
  loader: ({ context, deps }) => {
    // The tab on screen: the page reads each one's data as it is shown.
    if (deps.tab === 'topics') {
      void context.queryClient.prefetchQuery(notificationTopicsQuery())
    } else {
      void context.queryClient.prefetchQuery(notificationCategoriesQuery())
    }
  },
  component: UserNotifications,
})
