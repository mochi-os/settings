// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

export const APP_ROUTES = {
  // Settings app (current)
  SETTINGS: {
    BASE: '/',
    HOME: '/',
    USER: {
      ACCOUNT: '/user/account',
      LOGIN: '/user/login',
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
