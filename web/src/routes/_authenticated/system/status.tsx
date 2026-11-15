// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { createFileRoute } from '@tanstack/react-router'
import { systemNetworksQuery } from '@/hooks/use-system-networks'
import { systemPeersQuery } from '@/hooks/use-system-peers'
import { serverSettingsQuery } from '@/hooks/use-system-settings'
import { systemUpdateQuery } from '@/hooks/use-system-update'
import { SystemStatus } from '@/features/system/status'

export const Route = createFileRoute('/_authenticated/system/status')({
  // The page's data, asked for beside the route's code rather than once the
  // page has mounted. Not awaited: the page's hooks join them.
  loader: ({ context }) => {
    const { queryClient } = context
    void queryClient.prefetchQuery(serverSettingsQuery())
    void queryClient.prefetchQuery(systemUpdateQuery())
    void queryClient.prefetchQuery(systemNetworksQuery())
    void queryClient.prefetchQuery(systemPeersQuery())
  },
  component: SystemStatus,
})
