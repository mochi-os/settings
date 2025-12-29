const endpoints = {
  auth: {
    code: '/_/code',
    verify: '/_/verify',
    identity: '/_/identity',
    logout: '/_/logout',
  },
  user: {
    account: '/settings/user/account/data',
    accountIdentity: '/settings/user/account/identity',
    accountSessions: '/settings/user/account/sessions',
    accountSessionRevoke: '/settings/user/account/session/revoke',
    // Login methods
    accountMethods: '/settings/user/account/methods',
    accountMethodsSet: '/settings/user/account/methods/set',
    // Passkeys
    accountPasskeys: '/settings/user/account/passkeys',
    accountPasskeyRegisterBegin: '/settings/user/account/passkey/register/begin',
    accountPasskeyRegisterFinish: '/settings/user/account/passkey/register/finish',
    accountPasskeyRename: '/settings/user/account/passkey/rename',
    accountPasskeyDelete: '/settings/user/account/passkey/delete',
    // TOTP
    accountTotp: '/settings/user/account/totp',
    accountTotpSetup: '/settings/user/account/totp/setup',
    accountTotpVerify: '/settings/user/account/totp/verify',
    accountTotpDisable: '/settings/user/account/totp/disable',
    // Recovery
    accountRecovery: '/settings/user/account/recovery',
    accountRecoveryGenerate: '/settings/user/account/recovery/generate',
    // API Tokens
    accountTokens: '/settings/user/account/tokens',
    accountTokenCreate: '/settings/user/account/token/create',
    accountTokenDelete: '/settings/user/account/token/delete',
    // Preferences
    preferences: '/settings/user/preferences/data',
    preferencesSet: '/settings/user/preferences/set',
    preferencesReset: '/settings/user/preferences/reset',
  },
  system: {
    settings: '/settings/system/settings/list',
    settingsGet: '/settings/system/settings/get',
    settingsSet: '/settings/system/settings/set',
    users: '/settings/system/users/data',
    usersList: '/settings/system/users/list',
    usersGet: '/settings/system/users/get',
    usersCreate: '/settings/system/users/create',
    usersUpdate: '/settings/system/users/update',
    usersDelete: '/settings/system/users/delete',
    usersSuspend: '/settings/system/users/suspend',
    usersActivate: '/settings/system/users/activate',
    usersSessions: '/settings/system/users/sessions',
    usersSessionsRevoke: '/settings/system/users/sessions/revoke',
  },
  domains: {
    data: '/settings/domains/data',
    create: '/settings/domains/create',
    get: '/settings/domains/get',
    update: '/settings/domains/update',
    delete: '/settings/domains/delete',
    routeCreate: '/settings/domains/route/create',
    routeUpdate: '/settings/domains/route/update',
    routeDelete: '/settings/domains/route/delete',
    delegationCreate: '/settings/domains/delegation/create',
    delegationDelete: '/settings/domains/delegation/delete',
    userSearch: '/settings/domains/user/search',
    apps: '/settings/domains/apps',
    entities: '/settings/domains/entities',
  },
} as const

export type Endpoints = typeof endpoints

export default endpoints