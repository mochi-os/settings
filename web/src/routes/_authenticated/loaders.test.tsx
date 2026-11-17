// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
// Every settings page asks for its data from its route's loader, beside the
// route's code, and the layout asks for what the sidebar is drawn from as the
// navigation starts, rather than each once its component has mounted. The
// loaders and the hooks share their options, so a page mounting on the
// loader's answer asks for nothing a second time. Each case below holds every
// answer back, so a request seen at all was sent before any answer arrived;
// then it lets them through, mounts the page's own hooks, and counts.
import type { ComponentType, ReactNode } from 'react'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import {
  documentQuery,
  getApiBasepath,
  getAppPath,
  useAccounts,
  useAuthStore,
} from '@mochi/web'
import { render, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import endpoints from '@/api/endpoints'
import {
  useAccountData,
  useAuthMethods,
  useMethods,
  useOauthIdentities,
  usePasskeys,
  useRecoveryStatus,
  useSessions,
  useTotpStatus,
} from '@/hooks/use-account'
import { useDomainsData } from '@/hooks/use-domains'
import { useInterests } from '@/hooks/use-interests'
import { useNetworksData, useNetworksOffered } from '@/hooks/use-networks'
import {
  notificationCategoriesQuery,
  notificationDevicesQuery,
  notificationTopicsQuery,
} from '@/hooks/use-notifications'
import { languagesQuery, usePreferencesData } from '@/hooks/use-preferences'
import {
  useSystemDocument,
  useSystemDocumentsData,
} from '@/hooks/use-system-documents'
import {
  useSystemBlocks,
  useSystemHosts,
  useSystemReports,
} from '@/hooks/use-system-moderation'
import {
  useSystemHandles,
  useSystemNetworks,
} from '@/hooks/use-system-networks'
import { useSystemPeers } from '@/hooks/use-system-peers'
import { useSystemSettingsData } from '@/hooks/use-system-settings'
import { useSystemUpdate } from '@/hooks/use-system-update'
import { useSystemUsersData } from '@/hooks/use-system-users'
import { Route as privacy } from './document/privacy'
import { Route as rules } from './document/rules'
import { Route as terms } from './document/terms'
import { Route as domains } from './domains'
import { Route as layout } from './route'
import { Route as blocks } from './system/blocks'
import { Route as documents } from './system/documents'
import { Route as federation } from './system/federation'
import { Route as handles } from './system/handles'
import { Route as reports } from './system/reports'
import { Route as serverSettings } from './system/settings'
import { Route as status } from './system/status'
import { Route as users } from './system/users'
import { Route as account } from './user/account'
import { Route as accounts } from './user/accounts'
import { Route as display } from './user/display'
import { Route as interests } from './user/interests'
import { Route as links } from './user/links'
import { Route as login } from './user/login'
import { Route as networks } from './user/networks'
import { Route as notifications } from './user/notifications'
import { Route as preferences } from './user/preferences'
import { Route as sessions } from './user/sessions'

// The layout's shell is the library's concern; here only its own hooks are.
vi.mock('@mochi/web', async (original) => ({
  ...(await original<typeof import('@mochi/web')>()),
  AuthenticatedLayout: () => null,
  useTheme: () => ({ setTheme: () => {}, setColorTheme: () => {} }),
}))

// Every request the app sends, by method, address and body, and the answers
// held until released.
let asked: string[] = []
let held: (() => void)[] = []
let holding = true

// Where a request for url goes, as the client resolves it against the page:
// path and query.
function at(url: string) {
  const target = new URL(url, `${window.location.origin}${getApiBasepath()}`)
  return `${target.pathname}${target.search}`
}

// An answer each query can read; the rest answer {}.
const answers: Record<string, unknown> = {
  [at(endpoints.user.preferences)]: {
    preferences: { appearance: 'auto' },
    themes: [],
    presets: {},
    default_theme: '',
  },
  [at('/_/languages')]: { languages: ['en'] },
}

// The library's client sends every request by fetch, as do the few core
// routes a page reads with fetch itself, so one stub in its place sees them
// all: the app's own and the library's hooks'.
function fetched(input: string | URL, init?: RequestInit) {
  const target = at(String(input))
  const method = (init?.method ?? 'GET').toUpperCase()
  const body = typeof init?.body === 'string' ? ` ${init.body}` : ''
  asked.push(`${method} ${target}${body}`)
  return new Promise<Response>((resolve) => {
    const answer = () =>
      resolve(
        new Response(JSON.stringify(answers[target] ?? {}), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
    if (holding) held.push(answer)
    else answer()
  })
}

function release() {
  holding = false
  for (const answer of held) answer()
  held = []
}

beforeEach(() => {
  asked = []
  held = []
  holding = true
  vi.stubGlobal('fetch', fetched)
  i18n.loadAndActivate({ locale: 'en', messages: {} })
  useAuthStore.setState({ isInitialized: true, isAuthenticated: true })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// As the app's own client: nothing is fresh unless its query says so.
function client() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  })
}

type Hooks = () => unknown

interface Case {
  name: string
  run: (queryClient: QueryClient) => unknown
  // What the loader asks for, as the stub records it.
  requests: string[]
  // The page's own hooks, mounted on the loader's answers.
  usePage: Hooks
}

const GET = (url: string) => `GET ${at(url)}`
const POST = (url: string, body: object) =>
  `POST ${at(url)} ${JSON.stringify(body)}`

// Call a route's loader or beforeLoad as the router does, with what each
// reads.
function load(route: { options: object }, deps: Record<string, unknown> = {}) {
  return (queryClient: QueryClient) => {
    const options = route.options as {
      loader?: (match: object) => unknown
      beforeLoad?: (match: object) => unknown
    }
    const match = { context: { queryClient }, deps, params: {} }
    return (options.loader ?? options.beforeLoad)!(match)
  }
}

const usePreferencePage = () => usePreferencesData()

const cases: Case[] = [
  {
    name: 'the layout',
    run: load(layout),
    requests: [
      GET(endpoints.user.account),
      GET(endpoints.domains.data),
      GET(endpoints.networks.offered),
      GET(endpoints.user.preferences),
    ],
    usePage: () => {
      useAccountData()
      useDomainsData()
      useNetworksOffered()
      usePreferencesData()
    },
  },
  {
    name: 'domains',
    run: load(domains),
    requests: [GET(endpoints.domains.data)],
    usePage: () => useDomainsData(),
  },
  ...(
    [
      ['privacy', privacy],
      ['rules', rules],
      ['terms', terms],
    ] as const
  ).map(([name, route]) => ({
    name: `the ${name} document`,
    run: load(route),
    requests: [POST('-/document/get', { name })],
    usePage: () => useQuery(documentQuery(name)),
  })),
  {
    name: 'system blocks',
    run: load(blocks),
    requests: [GET(endpoints.system.blocksList)],
    usePage: () => useSystemBlocks(),
  },
  {
    name: 'system documents',
    run: load(documents),
    requests: [
      GET(endpoints.system.documents),
      GET(`${endpoints.system.documentGet}?name=rules&language=en`),
    ],
    usePage: () => {
      useSystemDocumentsData()
      useSystemDocument('rules', 'en')
    },
  },
  {
    name: 'a system document the address names',
    run: load(documents, { tab: 'terms', language: 'fr' }),
    requests: [
      GET(endpoints.system.documents),
      GET(`${endpoints.system.documentGet}?name=terms&language=fr`),
    ],
    usePage: () => {
      useSystemDocumentsData()
      useSystemDocument('terms', 'fr')
    },
  },
  {
    name: 'federation',
    run: load(federation),
    requests: [GET(endpoints.system.hosts)],
    usePage: () => useSystemHosts(),
  },
  {
    name: 'handles',
    run: load(handles),
    requests: [
      POST(endpoints.system.handlesList, { limit: 25, offset: 0, search: '' }),
    ],
    usePage: () => useSystemHandles(25, 0, ''),
  },
  {
    name: 'reports',
    run: load(reports, { state: undefined }),
    requests: [GET(`${endpoints.system.reportsList}?state=open`)],
    usePage: () => useSystemReports('open'),
  },
  {
    name: 'resolved reports',
    run: load(reports, { state: 'resolved' }),
    requests: [GET(`${endpoints.system.reportsList}?state=resolved`)],
    usePage: () => useSystemReports('resolved'),
  },
  {
    name: 'server settings',
    run: load(serverSettings),
    requests: [GET(endpoints.system.settings)],
    usePage: () => useSystemSettingsData(),
  },
  {
    name: 'status',
    run: load(status),
    requests: [
      GET(endpoints.system.settings),
      GET(endpoints.system.update),
      GET(endpoints.system.networks),
      GET(endpoints.system.peers),
    ],
    usePage: () => {
      useSystemSettingsData()
      useSystemUpdate()
      useSystemNetworks()
      useSystemPeers()
    },
  },
  {
    name: 'users',
    run: load(users),
    requests: [
      GET(endpoints.user.account),
      POST(endpoints.system.usersList, {
        limit: 25,
        offset: 0,
        search: '',
        sort: 'username',
        order: 'asc',
      }),
    ],
    usePage: () => {
      useAccountData()
      useSystemUsersData(25, 0, '', 'username', 'asc')
    },
  },
  {
    name: 'account',
    run: load(account),
    requests: [GET(endpoints.user.account)],
    usePage: () => useAccountData(),
  },
  {
    name: 'connected accounts',
    run: load(accounts),
    requests: [
      GET(`${getAppPath()}/-/accounts/providers`),
      GET(`${getAppPath()}/-/accounts/list`),
      GET(endpoints.notifications.devices),
    ],
    usePage: () => {
      useAccounts(getAppPath())
      useQuery(notificationDevicesQuery())
    },
  },
  {
    name: 'display',
    run: load(display),
    requests: [GET(endpoints.user.preferences)],
    usePage: usePreferencePage,
  },
  {
    name: 'interests',
    run: load(interests),
    requests: [GET(endpoints.user.interests)],
    usePage: () => useInterests(),
  },
  {
    name: 'links',
    run: load(links),
    requests: [GET(endpoints.user.preferences)],
    usePage: usePreferencePage,
  },
  {
    name: 'login',
    run: load(login),
    requests: [
      GET(endpoints.user.accountMethods),
      GET(endpoints.user.accountPasskeys),
      GET(endpoints.user.accountTotp),
      GET(endpoints.user.accountOauth),
      GET(endpoints.user.authMethods),
      GET(endpoints.user.accountRecovery),
    ],
    usePage: () => {
      useMethods()
      usePasskeys()
      useTotpStatus()
      useOauthIdentities()
      useAuthMethods()
      useRecoveryStatus()
    },
  },
  {
    name: 'networks',
    run: load(networks),
    requests: [GET(endpoints.networks.data)],
    usePage: () => useNetworksData(),
  },
  {
    name: 'notification categories',
    run: load(notifications, { tab: undefined }),
    requests: [
      GET(endpoints.notifications.categories),
      GET(endpoints.notifications.destinations),
    ],
    usePage: () => useQuery(notificationCategoriesQuery()),
  },
  {
    name: 'notification topics',
    run: load(notifications, { tab: 'topics' }),
    requests: [
      GET(endpoints.notifications.topics),
      GET(endpoints.notifications.categories),
    ],
    usePage: () => useQuery(notificationTopicsQuery()),
  },
  {
    name: 'preferences',
    run: load(preferences),
    requests: [GET(endpoints.user.preferences), GET('/_/languages')],
    usePage: () => {
      usePreferencesData()
      useQuery(languagesQuery())
    },
  },
  {
    name: 'sessions',
    run: load(sessions),
    requests: [GET(endpoints.user.accountSessions)],
    usePage: () => useSessions(),
  },
]

describe('settings route loaders', () => {
  it.each(cases)(
    '$name: asks before any answer arrives, and its page asks again for none',
    async ({ run, requests, usePage }) => {
      const queryClient = client()

      await run(queryClient)

      await vi.waitFor(() =>
        expect([...asked].sort()).toEqual([...requests].sort())
      )
      // Every answer is still held: the requests went before the page.
      expect(held).toHaveLength(requests.length)

      release()
      await vi.waitFor(() =>
        expect(
          queryClient
            .getQueryCache()
            .getAll()
            .every((query) => query.state.status === 'success')
        ).toBe(true)
      )

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )
      renderHook(usePage, { wrapper })
      await new Promise((resolve) => setTimeout(resolve, 20))

      expect([...asked].sort()).toEqual([...requests].sort())
    }
  )
})

// The cases above mount the hooks each page names; the layout's own component
// is mounted here, so a sidebar that read the Networks page's whole data again
// for its one entry would show as a request the loader never sent.
describe('settings layout', () => {
  it('asks for nothing its beforeLoad did not', async () => {
    const queryClient = client()
    const [layoutCase] = cases
    await layoutCase.run(queryClient)
    release()
    await vi.waitFor(() =>
      expect(
        queryClient
          .getQueryCache()
          .getAll()
          .every((query) => query.state.status === 'success')
      ).toBe(true)
    )

    const Layout = (layout.options as { component: ComponentType }).component
    render(
      <QueryClientProvider client={queryClient}>
        <I18nProvider i18n={i18n}>
          <Layout />
        </I18nProvider>
      </QueryClientProvider>
    )
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect([...asked].sort()).toEqual([...layoutCase.requests].sort())
    expect(asked).not.toContain(GET(endpoints.networks.data))
  })
})
