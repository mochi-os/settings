import { createFileRoute } from '@tanstack/react-router'
import { useAuthStore, AuthenticatedLayout } from '@mochi/web'
import { useFilteredSidebarData, useSidebarData } from '@/components/layout/data/sidebar-data'
import { useAccountData } from '@/hooks/use-account'
import { useDomainsData } from '@/hooks/use-domains'

function SettingsLayout() {
  const { data: accountData } = useAccountData()
  const { data: domainsData } = useDomainsData()

  const isAdmin = accountData?.role === 'administrator'
  const hasDomainAccess =
    isAdmin || (domainsData?.delegations?.length ?? 0) > 0

  // Only show full sidebar once we know what's available.
  // Both hooks are called unconditionally to satisfy the rules of hooks; we
  // pick which result to use based on isLoaded.
  const isLoaded = accountData !== undefined && domainsData !== undefined
  const fallback = useSidebarData()
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
