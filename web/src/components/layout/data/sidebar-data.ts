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
} from 'lucide-react'
import { type SidebarData } from '@mochi/common'

// User menu items (visible to all users)
const userNavGroup = {
  title: 'User',
  items: [
    {
      title: 'Account',
      url: APP_ROUTES.SETTINGS.USER.ACCOUNT,
      icon: User,
    },
    {
      title: 'Preferences',
      url: APP_ROUTES.SETTINGS.USER.PREFERENCES,
      icon: Palette,
    },
    {
      title: 'Tokens',
      url: APP_ROUTES.SETTINGS.USER.TOKENS,
      icon: Key,
    },
    {
      title: 'Sessions',
      url: APP_ROUTES.SETTINGS.USER.SESSIONS,
      icon: Monitor,
    },
  ],
}

// Management menu items (visible to users with domain access)
const domainsNavItem = {
  title: 'Domains',
  url: APP_ROUTES.SETTINGS.DOMAINS,
  icon: Globe,
}

// System menu items (admin only)
const systemNavGroup = {
  title: 'System',
  items: [
    {
      title: 'Settings',
      url: APP_ROUTES.SETTINGS.SYSTEM.SETTINGS,
      icon: Settings,
    },
    {
      title: 'Users',
      url: APP_ROUTES.SETTINGS.SYSTEM.USERS,
      icon: Users,
    },
    {
      title: 'Status',
      url: APP_ROUTES.SETTINGS.SYSTEM.STATUS,
      icon: Activity,
    },
  ],
}

// Build sidebar data based on admin status and domain access
export function getSidebarData(
  isAdmin: boolean,
  hasDomainAccess: boolean
): SidebarData {
  if (isAdmin) {
    // Admin: show grouped sections
    const navGroups: SidebarData['navGroups'] = [userNavGroup]
    if (hasDomainAccess) {
      navGroups.push({
        title: 'Management',
        items: [domainsNavItem],
      })
    }
    navGroups.push(systemNavGroup)
    return { navGroups }
  }

  // Non-admin: flat list with no group titles
  const items = hasDomainAccess
    ? [...userNavGroup.items, domainsNavItem]
    : userNavGroup.items
  return {
    navGroups: [{ title: '', items }],
  }
}

// Default sidebar (for initial load, flat list until we know access)
export const sidebarData: SidebarData = {
  navGroups: [{ title: '', items: userNavGroup.items }],
}
