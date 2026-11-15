// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { createFileRoute } from '@tanstack/react-router'
import { userPreferencesQuery } from '@/hooks/use-preferences'
import { UserLinks } from '@/features/user/links'

export const Route = createFileRoute('/_authenticated/user/links')({
  // The page's data, asked for beside the route's code rather than once the
  // page has mounted. Not awaited: the page's hooks join it.
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(userPreferencesQuery())
  },
  component: UserLinks,
})
