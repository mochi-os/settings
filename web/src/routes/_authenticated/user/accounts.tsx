// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { createFileRoute } from '@tanstack/react-router'
import { accountListQuery, accountProvidersQuery, getAppPath } from '@mochi/web'
import { notificationDevicesQuery } from '@/hooks/use-notifications'
import { ConnectedAccounts } from '@/features/user/connected-accounts'

export const Route = createFileRoute('/_authenticated/user/accounts')({
  // The page's data, asked for beside the route's code rather than once the
  // page has mounted. Not awaited: the page's hooks join them.
  loader: ({ context }) => {
    const { queryClient } = context
    void queryClient.prefetchQuery(accountProvidersQuery(getAppPath()))
    void queryClient.prefetchQuery(accountListQuery(getAppPath()))
    void queryClient.prefetchQuery(notificationDevicesQuery())
  },
  component: ConnectedAccounts,
})
