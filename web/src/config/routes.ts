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
      SESSIONS: '/user/sessions',
      TOKENS: '/user/tokens',
      PREFERENCES: '/user/preferences',
      APPS: '/user/apps',
    },
    SYSTEM: {
      SETTINGS: '/system/settings',
      USERS: '/system/users',
      STATUS: '/system/status',
      APPS: '/system/apps',
    },
    DOMAINS: '/domains',
  },
} as const

export type AppRoutes = typeof APP_ROUTES
