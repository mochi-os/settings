// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { createFileRoute } from '@tanstack/react-router'
import { systemReportsQuery } from '@/hooks/use-system-moderation'
import { SystemReports } from '@/features/system/reports'

interface ReportsSearch {
  state?: 'open' | 'resolved'
}

export const Route = createFileRoute('/_authenticated/system/reports')({
  validateSearch: (search: Record<string, unknown>): ReportsSearch => ({
    state:
      search.state === 'open' || search.state === 'resolved'
        ? search.state
        : undefined,
  }),
  // The page's data, asked for beside the route's code rather than once the
  // page has mounted. Not awaited: the page's hooks join it.
  loaderDeps: ({ search }) => ({ state: search.state }),
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(
      systemReportsQuery(deps.state ?? 'open')
    )
  },
  component: SystemReports,
})
