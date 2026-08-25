// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { createFileRoute } from '@tanstack/react-router'
import { useAuthStore, AuthenticatedLayout } from '@mochi/web'
import { useFilteredSidebarData } from '@/components/layout/data/sidebar-data'
import { useAccountData } from '@/hooks/use-account'
import { useDomainsData } from '@/hooks/use-domains'
import { useApplyDisplayPreferences } from '@/hooks/use-preferences'

function SettingsLayout() {
  useApplyDisplayPreferences()
  const { data: accountData } = useAccountData()
  const { data: domainsData } = useDomainsData()

  const isAdmin = accountData?.role === 'administrator'
  const hasDomainAccess =
    isAdmin || (domainsData?.delegations?.length ?? 0) > 0

  // Only show the full sidebar once we know what's available. Until then the
  // no-admin, no-domains shape is the fallback - which is exactly what
  // useFilteredSidebarData answers for (false, false).
  const isLoaded = accountData !== undefined && domainsData !== undefined
  const fallback = useFilteredSidebarData(false, false)
  const filtered = useFilteredSidebarData(isAdmin, hasDomainAccess)
  const filteredSidebarData = isLoaded ? filtered : fallback

  return (
    <AuthenticatedLayout
      sidebarData={filteredSidebarData}
      usePageHeaderForMobileNav
    />
  )
}

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const store = useAuthStore.getState()
    if (!store.isInitialized) {
      await store.initialize()
    }
  },
  component: SettingsLayout,
})
