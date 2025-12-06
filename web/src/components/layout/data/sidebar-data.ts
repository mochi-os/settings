import { APP_ROUTES } from '@/config/routes'
import { User, Palette, Globe, Settings, Users, Home } from 'lucide-react'
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
          title: 'Preferences',
          url: APP_ROUTES.SETTINGS.USER.PREFERENCES,
          icon: Palette,
        },
        {
          title: 'My Domains',
          url: APP_ROUTES.SETTINGS.USER.DOMAINS,
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
        {
          title: 'Domains',
          url: APP_ROUTES.SETTINGS.SYSTEM.DOMAINS,
          icon: Globe,
        },
      ],
    },
    {
      title: 'Navigation',
      items: [
        {
          title: 'Home',
          url: APP_ROUTES.HOME.HOME,
          icon: Home,
          external: true,
        },
      ],
    },
  ],
}
