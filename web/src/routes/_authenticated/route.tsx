// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { createFileRoute } from '@tanstack/react-router'
import { useAuthStore, AuthenticatedLayout } from '@mochi/web'
import { accountDataQuery, useAccountData } from '@/hooks/use-account'
import { domainsQuery, useDomainsData } from '@/hooks/use-domains'
import { networksOfferedQuery, useNetworksOffered } from '@/hooks/use-networks'
import {
  useApplyDisplayPreferences,
  userPreferencesQuery,
} from '@/hooks/use-preferences'
import { useFilteredSidebarData } from '@/components/layout/data/sidebar-data'

function SettingsLayout() {
  useApplyDisplayPreferences()
  const { data: accountData } = useAccountData()
  const { data: domainsData } = useDomainsData()
  const { data: networksData } = useNetworksOffered()

  const isAdmin = accountData?.role === 'administrator'
  const hasDomainAccess = isAdmin || (domainsData?.delegations?.length ?? 0) > 0
  const hasNetworks = networksData?.offered === true

  // Only show the full sidebar once we know what's available. Until then the
  // no-admin, no-domains shape is the fallback - which is exactly what
  // useFilteredSidebarData answers for (false, false).
  const isLoaded = accountData !== undefined && domainsData !== undefined
  const fallback = useFilteredSidebarData(false, false, false)
  const filtered = useFilteredSidebarData(isAdmin, hasDomainAccess, hasNetworks)
  const filteredSidebarData = isLoaded ? filtered : fallback

  return <AuthenticatedLayout sidebarData={filteredSidebarData} />
}

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context }) => {
    const store = useAuthStore.getState()
    if (!store.isInitialized) {
      await store.initialize()
    }
    // What the layout draws on every page, asked for beside the page's own
    // queries rather than once the layout has mounted. Not awaited: the
    // layout's hooks join these with the same options.
    const { queryClient } = context
    void queryClient.prefetchQuery(accountDataQuery())
    void queryClient.prefetchQuery(domainsQuery())
    void queryClient.prefetchQuery(networksOfferedQuery())
    void queryClient.prefetchQuery(userPreferencesQuery())
  },
  component: SettingsLayout,
})
