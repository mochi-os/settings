export const APP_ROUTES = {
  // Settings app (current)
  SETTINGS: {
    BASE: '/',
    HOME: '/',
    USER: {
      ACCOUNT: '/user/account',
      PREFERENCES: '/user/preferences',
      ACCOUNTS: '/user/accounts',
      TOKENS: '/user/tokens',
      SESSIONS: '/user/sessions',
    },
    SYSTEM: {
      SETTINGS: '/system/settings',
      USERS: '/system/users',
      STATUS: '/system/status',
    },
    DOMAINS: '/domains',
  },
} as const

export type AppRoutes = typeof APP_ROUTES
