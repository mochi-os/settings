// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { createFileRoute } from '@tanstack/react-router'
import {
  systemHandlesOpening,
  systemHandlesQuery,
} from '@/hooks/use-system-networks'
import { SystemHandles } from '@/features/system/handles'

export const Route = createFileRoute('/_authenticated/system/handles')({
  // The page's data, asked for beside the route's code rather than once the
  // page has mounted. Not awaited: the page's hooks join it.
  loader: ({ context }) => {
    const { limit, offset, search } = systemHandlesOpening
    void context.queryClient.prefetchQuery(
      systemHandlesQuery(limit, offset, search)
    )
  },
  component: SystemHandles,
})
