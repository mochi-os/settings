import { createFileRoute } from '@tanstack/react-router'
import { useAuthStore, AuthenticatedLayout } from '@mochi/common'
import { getSidebarData, sidebarData } from '@/components/layout/data/sidebar-data'
import { useAccountData } from '@/hooks/use-account'
import { useDomainsData } from '@/hooks/use-domains'

function SettingsLayout() {
  const { data: accountData } = useAccountData()
  const { data: domainsData } = useDomainsData()

  const isAdmin = accountData?.role === 'administrator'
  const hasDomainAccess =
    isAdmin || (domainsData?.delegations?.length ?? 0) > 0

  // Only show full sidebar once we know what's available
  const isLoaded = accountData !== undefined && domainsData !== undefined
  const filteredSidebarData = isLoaded
    ? getSidebarData(isAdmin, hasDomainAccess)
    : sidebarData

  return <AuthenticatedLayout sidebarData={filteredSidebarData} />
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
