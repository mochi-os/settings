// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { createFileRoute } from '@tanstack/react-router'
import { accountDataQuery } from '@/hooks/use-account'
import { systemUsersOpening, systemUsersQuery } from '@/hooks/use-system-users'
import { SystemUsers } from '@/features/system/users'

export const Route = createFileRoute('/_authenticated/system/users')({
  // The page's data, asked for beside the route's code rather than once the
  // page has mounted. Not awaited: the page's hooks join them.
  loader: ({ context }) => {
    const { queryClient } = context
    const { limit, offset, search, sort, order } = systemUsersOpening
    void queryClient.prefetchQuery(accountDataQuery())
    void queryClient.prefetchQuery(
      systemUsersQuery(limit, offset, search, sort, order)
    )
  },
  component: SystemUsers,
})
