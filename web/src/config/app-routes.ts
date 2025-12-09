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
  FEEDS: {
    BASE: '/feeds/',
    HOME: '/feeds/',
  },
  FORUMS: {
    BASE: '/forums/',
    HOME: '/forums/',
  },
  TEMPLATE: {
    BASE: '/template/',
    HOME: '/template/',
  },
  // Settings app (current)
  SETTINGS: {
    BASE: './',
    HOME: './',
    USER: {
      SETTINGS: '/user',
      ACCOUNT: '/user/account',
      SESSIONS: '/user/sessions',
      PREFERENCES: '/user/preferences',
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

