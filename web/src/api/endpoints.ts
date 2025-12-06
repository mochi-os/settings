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
    domains: 'user/domains/data',
    domainsList: 'user/domains/list',
    domainsRegister: 'user/domains/register',
    domainsDelete: 'user/domains/delete',
    domainsRoutes: 'user/domains/routes',
    domainsRouteSet: 'user/domains/route/set',
    domainsRouteDelete: 'user/domains/route/delete',
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
    domains: 'system/domains/data',
    domainsList: 'system/domains/list',
    domainsGet: 'system/domains/get',
    domainsUpdate: 'system/domains/update',
    domainsDelete: 'system/domains/delete',
    domainsRoutes: 'system/domains/routes',
    domainsDelegations: 'system/domains/delegations',
    domainsDelegationCreate: 'system/domains/delegation/create',
    domainsDelegationDelete: 'system/domains/delegation/delete',
  },
} as const

export type Endpoints = typeof endpoints

export default endpoints
