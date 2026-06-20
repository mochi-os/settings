// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

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
