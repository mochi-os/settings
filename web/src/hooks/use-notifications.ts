// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { queryOptions } from '@tanstack/react-query'
import type {
  Category,
  DestinationsAvailable,
  Device,
  Topic,
} from '@/types/notifications'
import { requestHelpers } from '@mochi/web'
import endpoints from '@/api/endpoints'
import { fresh } from '@/lib/fresh'

// Each query's options are shared by the page that reads it and the route
// loader that starts it. Every change on the notifications page invalidates
// ['notifications'], so all three refetch after one.

// The categories with the destinations a category may send to.
export function notificationCategoriesQuery() {
  return queryOptions({
    queryKey: ['notifications', 'categories'],
    queryFn: async () => {
      const [cats, dests] = await Promise.all([
        requestHelpers.get<Category[]>(endpoints.notifications.categories),
        requestHelpers.get<DestinationsAvailable>(
          endpoints.notifications.destinations
        ),
      ])
      return {
        categories: cats ?? [],
        available:
          dests ??
          ({ accounts: [], feeds: [], devices: [] } as DestinationsAvailable),
      }
    },
    staleTime: fresh.page,
  })
}

// The topics apps notify about, with the categories one may be put in.
export function notificationTopicsQuery() {
  return queryOptions({
    queryKey: ['notifications', 'topics'],
    queryFn: async () => {
      const [loadedTopics, loadedCategories] = await Promise.all([
        requestHelpers.get<Topic[]>(endpoints.notifications.topics),
        requestHelpers.get<Category[]>(endpoints.notifications.categories),
      ])
      return { topics: loadedTopics ?? [], categories: loadedCategories ?? [] }
    },
    staleTime: fresh.page,
  })
}

// The devices the user runs Mochi on, which the connected accounts page lists.
export function notificationDevicesQuery() {
  return queryOptions({
    queryKey: ['notifications', 'devices'],
    queryFn: () =>
      requestHelpers.get<Device[]>(endpoints.notifications.devices),
    staleTime: fresh.page,
  })
}
