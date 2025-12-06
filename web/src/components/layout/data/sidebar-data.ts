import { APP_ROUTES } from '@/config/routes'
import { User, Key, Palette, Globe, Settings, Users } from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  navGroups: [
    {
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
          icon: Key,
        },
        {
          title: 'Preferences',
          url: APP_ROUTES.SETTINGS.USER.PREFERENCES,
          icon: Palette,
        },
      ],
    },
    {
      title: 'Management',
      items: [
        {
          title: 'Domains',
          url: APP_ROUTES.SETTINGS.DOMAINS,
          icon: Globe,
        },
      ],
    },
    {
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
      ],
    },
  ],
}
