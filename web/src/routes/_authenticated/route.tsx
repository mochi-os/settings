import { createFileRoute } from '@tanstack/react-router'
import { useAuthStore, getCookie, AuthenticatedLayout } from '@mochi/common'
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
  beforeLoad: async ({ location }) => {
    const store = useAuthStore.getState()

    if (!store.isInitialized) {
      store.initialize()
    }

    const token = getCookie('token') || store.token

    if (!token) {
      const returnUrl = encodeURIComponent(
        location.href ||
          window.location.pathname +
            window.location.search +
            window.location.hash
      )
      const redirectUrl = `${import.meta.env.VITE_AUTH_LOGIN_URL}?redirect=${returnUrl}`
      window.location.href = redirectUrl
      return
    }

    // Load identity
    await store.loadIdentity()

    return
  },
  component: SettingsLayout,
})
