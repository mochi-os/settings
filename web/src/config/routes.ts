export const APP_ROUTES = {
  // Settings app (current)
  SETTINGS: {
    BASE: '/',
    HOME: '/',
    USER: {
      ACCOUNT: '/user/account',
      PREFERENCES: '/user/preferences',
      DISPLAY: '/user/display',
      ACCOUNTS: '/user/accounts',
      INTERESTS: '/user/interests',
      NOTIFICATIONS: '/user/notifications',
      TOKENS: '/user/tokens',
      SESSIONS: '/user/sessions',
      REPLICATION: '/user/replication',
    },
    SYSTEM: {
      SETTINGS: '/system/settings',
      DOCUMENTS: '/system/documents',
      USERS: '/system/users',
      STATUS: '/system/status',
      REPLICATION: '/system/replication',
    },
    DOMAINS: '/domains',
  },
} as const
