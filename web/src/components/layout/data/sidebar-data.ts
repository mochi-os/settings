import { APP_ROUTES } from '@/config/routes'
import {
  User,
  Monitor,
  Key,
  Palette,
  Globe,
  Settings,
  Users,
  Activity,
  Link2,
  Star,
  Bell,
} from 'lucide-react'
import { type SidebarData } from '@mochi/web'
import { useLingui } from '@lingui/react/macro'

type T = (s: TemplateStringsArray, ...args: unknown[]) => string

function buildUserNavGroup(t: T) {
  return {
    title: t`Settings`,
    items: [
      { title: t`Account`, url: APP_ROUTES.SETTINGS.USER.ACCOUNT, icon: User },
      { title: t`Preferences`, url: APP_ROUTES.SETTINGS.USER.PREFERENCES, icon: Palette },
      { title: t`Interests`, url: APP_ROUTES.SETTINGS.USER.INTERESTS, icon: Star },
      { title: t`Connected accounts`, url: APP_ROUTES.SETTINGS.USER.ACCOUNTS, icon: Link2 },
      { title: t`Notifications`, url: APP_ROUTES.SETTINGS.USER.NOTIFICATIONS, icon: Bell },
      { title: t`Tokens`, url: APP_ROUTES.SETTINGS.USER.TOKENS, icon: Key },
      { title: t`Sessions`, url: APP_ROUTES.SETTINGS.USER.SESSIONS, icon: Monitor },
    ],
  }
}

function buildSystemNavGroup(t: T) {
  return {
    title: t`System`,
    items: [
      { title: t`System settings`, url: APP_ROUTES.SETTINGS.SYSTEM.SETTINGS, icon: Settings },
      { title: t`Users`, url: APP_ROUTES.SETTINGS.SYSTEM.USERS, icon: Users },
      { title: t`Status`, url: APP_ROUTES.SETTINGS.SYSTEM.STATUS, icon: Activity },
    ],
  }
}

export function useSidebarData(): SidebarData {
  const { t } = useLingui()
  return { navGroups: [{ title: t`Settings`, items: buildUserNavGroup(t).items }] }
}

export function useFilteredSidebarData(isAdmin: boolean, hasDomainAccess: boolean): SidebarData {
  const { t } = useLingui()
  const userNavGroup = buildUserNavGroup(t)
  const domainsNavItem = {
    title: t`Domains`,
    url: APP_ROUTES.SETTINGS.DOMAINS,
    icon: Globe,
  }

  if (isAdmin) {
    const navGroups: SidebarData['navGroups'] = [userNavGroup]
    if (hasDomainAccess) {
      navGroups.push({ title: t`Management`, items: [domainsNavItem] })
    }
    navGroups.push(buildSystemNavGroup(t))
    return { navGroups }
  }

  const items = hasDomainAccess
    ? [...userNavGroup.items, domainsNavItem]
    : userNavGroup.items
  return { navGroups: [{ title: t`Settings`, items }] }
}
