export const APP_ROUTES = {
  // Settings app (current)
  SETTINGS: {
    BASE: '/',
    HOME: '/',
    USER: {
      ACCOUNT: '/user/account',
      PREFERENCES: '/user/preferences',
      ACCOUNTS: '/user/accounts',
      INTERESTS: '/user/interests',
      NOTIFICATIONS: '/user/notifications',
      TOKENS: '/user/tokens',
      SESSIONS: '/user/sessions',
    },
    SYSTEM: {
      SETTINGS: '/system/settings',
      DOCUMENTS: '/system/documents',
      USERS: '/system/users',
      STATUS: '/system/status',
    },
    DOMAINS: '/domains',
  },
} as const
