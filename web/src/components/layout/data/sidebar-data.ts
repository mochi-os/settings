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
  Package,
  AppWindow,
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
      title: 'Sessions',
      url: APP_ROUTES.SETTINGS.USER.SESSIONS,
      icon: Monitor,
    },
    {
      title: 'API Tokens',
      url: APP_ROUTES.SETTINGS.USER.TOKENS,
      icon: Key,
    },
    {
      title: 'Preferences',
      url: APP_ROUTES.SETTINGS.USER.PREFERENCES,
      icon: Palette,
    },
    {
      title: 'App preferences',
      url: APP_ROUTES.SETTINGS.USER.APPS,
      icon: AppWindow,
    },
  ],
}

// Management menu items (visible to all users)
const managementNavGroup = {
  title: 'Management',
  items: [
    {
      title: 'Domains',
      url: APP_ROUTES.SETTINGS.DOMAINS,
      icon: Globe,
    },
  ],
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
      title: 'Apps',
      url: APP_ROUTES.SETTINGS.SYSTEM.APPS,
      icon: Package,
    },
    {
      title: 'Status',
      url: APP_ROUTES.SETTINGS.SYSTEM.STATUS,
      icon: Activity,
    },
  ],
}

// Build sidebar data based on admin status
export function getSidebarData(isAdmin: boolean): SidebarData {
  const navGroups = [userNavGroup, managementNavGroup]
  if (isAdmin) {
    navGroups.push(systemNavGroup)
  }
  return { navGroups }
}

// Default sidebar (for initial load, includes all items)
export const sidebarData: SidebarData = {
  navGroups: [userNavGroup, managementNavGroup, systemNavGroup],
}
