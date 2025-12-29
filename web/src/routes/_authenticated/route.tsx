import { createFileRoute } from '@tanstack/react-router'
import { useAuthStore, getCookie, AuthenticatedLayout } from '@mochi/common'
import { getSidebarData, sidebarData } from '@/components/layout/data/sidebar-data'
import { useAccountData } from '@/hooks/use-account'

function SettingsLayout() {
  const { data: accountData } = useAccountData()
  const isAdmin = accountData?.role === 'administrator'
  const filteredSidebarData = accountData ? getSidebarData(isAdmin) : sidebarData

  return <AuthenticatedLayout sidebarData={filteredSidebarData} />
}

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    const store = useAuthStore.getState()

    if (!store.isInitialized) {
      store.syncFromCookie()
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

    return
  },
  component: SettingsLayout,
})
