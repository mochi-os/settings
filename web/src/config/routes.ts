export const APP_ROUTES = {
  // External apps
  HOME: {
    BASE: '/',
    HOME: '/',
  },
  CHAT: {
    BASE: '/chat/',
    HOME: '/chat/',
  },
  FRIENDS: {
    BASE: '/friends/',
    HOME: '/friends/',
  },
  NOTIFICATIONS: {
    BASE: '/notifications/',
    HOME: '/notifications/',
  },
  // Settings app (current)
  SETTINGS: {
    BASE: '/',
    HOME: '/',
    USER: {
      ACCOUNT: '/user/account',
      PREFERENCES: '/user/preferences',
      DOMAINS: '/user/domains',
    },
    SYSTEM: {
      SETTINGS: '/system/settings',
      USERS: '/system/users',
      DOMAINS: '/system/domains',
    },
  },
} as const

export type AppRoutes = typeof APP_ROUTES
