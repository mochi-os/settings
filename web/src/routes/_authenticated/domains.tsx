// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { createFileRoute } from '@tanstack/react-router'
import { domainsQuery } from '@/hooks/use-domains'
import { Domains } from '@/features/domains'

export const Route = createFileRoute('/_authenticated/domains')({
  // The page's data, asked for beside the route's code rather than once the
  // page has mounted. Not awaited: the page's hooks join it.
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(domainsQuery())
  },
  component: Domains,
})
