const endpoints = {
  auth: {
    code: '/_/code',
    verify: '/_/verify',
    identity: '/_/identity',
    logout: '/_/logout',
  },
  user: {
    account: 'user/account/data',
    accountIdentity: 'user/account/identity',
    accountSessions: 'user/account/sessions',
    accountSessionRevoke: 'user/account/session/revoke',
    preferences: 'user/preferences/data',
    preferencesSet: 'user/preferences/set',
    preferencesReset: 'user/preferences/reset',
  },
  system: {
    settings: 'system/settings/data',
    settingsList: 'system/settings/list',
    settingsGet: 'system/settings/get',
    settingsSet: 'system/settings/set',
    users: 'system/users/data',
    usersList: 'system/users/list',
    usersGet: 'system/users/get',
    usersCreate: 'system/users/create',
    usersUpdate: 'system/users/update',
    usersDelete: 'system/users/delete',
  },
  domains: {
    data: 'domains/data',
    get: 'domains/get',
    update: 'domains/update',
    delete: 'domains/delete',
    routeCreate: 'domains/route/create',
    routeUpdate: 'domains/route/update',
    routeDelete: 'domains/route/delete',
    delegationCreate: 'domains/delegation/create',
    delegationDelete: 'domains/delegation/delete',
    userSearch: 'domains/user/search',
  },
} as const

export type Endpoints = typeof endpoints

export default endpoints
