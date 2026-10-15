// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { NetworksData } from '@/types/networks'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { suggestHandle } from '@/lib/handles'
import {
  AliasesDialog,
  MoveDialog,
  Networks,
  PasswordDialog,
} from './networks'

const state = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('@mochi/web', async (original) => {
  const actual = await original<typeof import('@mochi/web')>()
  return {
    ...actual,
    toast: { success: state.success, error: state.error },
    shellNavigateTop: state.navigate,
    requestHelpers: {
      ...actual.requestHelpers,
      get: state.get,
      post: state.post,
    },
    usePageTitle: () => {},
  }
})

const alice = {
  domain: 'example.com',
  name: 'alice',
  parent: '',
  kind: 'handle',
  created: 1,
  addresses: {
    fediverse: '@alice@example.com',
    bluesky: 'alice.example.com',
  },
}

// A name under the handle: free, and listed in the handle's card.
const news = {
  domain: 'example.com',
  name: 'alice_news',
  parent: 'alice',
  kind: 'handle',
  created: 2,
  addresses: {
    fediverse: '@alice_news@example.com',
    bluesky: 'alice-news.example.com',
  },
}

const data: NetworksData = {
  offered: true,
  networks: ['fediverse', 'bluesky'],
  domains: ['example.com'],
  handles: { handles: [alice, news], limit: 1, counted: 1, unlimited: false },
  accounts: [
    {
      id: 'f1',
      type: 'fediverse',
      label: '',
      identifier: '@alice@example.com',
      created: 1,
      verified: 1,
      enabled: 1,
      default: '',
      hosted: true,
      server: 'example.com',
    },
    {
      id: 'm1',
      type: 'mastodon',
      label: 'Alice',
      identifier: '@alice@mastodon.social',
      created: 2,
      verified: 1,
      enabled: 1,
      default: '',
      hosted: false,
      server: 'mastodon.social',
    },
  ],
  providers: [
    {
      type: 'mastodon',
      capabilities: ['social'],
      link: {
        flow: 'oauth',
        fields: [
          {
            name: 'server',
            label: 'Server',
            type: 'text',
            required: true,
            placeholder: 'mastodon.social',
          },
        ],
      },
    },
  ],
  name: 'Alice Example',
  blocks: [
    { domain: 'spam.example', created: 3 },
    { actor: 'https://remote.example/u/troll', created: 4 },
  ],
  mutes: [{ actor: 'https://remote.example/u/loud', created: 5 }],
}

function show(answer: NetworksData = data) {
  state.get.mockResolvedValue(answer)
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider i18n={i18n}>
        <Networks />
      </I18nProvider>
    </QueryClientProvider>
  )
}

describe('Networks', () => {
  beforeEach(() => {
    i18n.load('en', {})
    i18n.activate('en')
    state.get.mockReset()
    state.post.mockReset()
    state.success.mockReset()
    state.error.mockReset()
    state.navigate.mockReset()
  })

  it('suggests a handle from the name within the rule', () => {
    expect(suggestHandle('Alice Example')).toBe('aliceexample')
    expect(suggestHandle('Zoë 99')).toBe('zoe99')
    expect(suggestHandle('123')).toBe('')
    expect(suggestHandle('a')).toBe('')
    expect(suggestHandle('x'.repeat(30))).toBe('x'.repeat(20))
  })

  it('shows each handle with a switch per network and the accounts together', async () => {
    show()
    // The card is titled with the handle and says what it is; the name under
    // it has its own rows, labelled with the name.
    await screen.findByText('Handle on example.com')
    expect(screen.getByText('alice')).toBeTruthy()
    expect(screen.getByText('alice_news on Fediverse')).toBeTruthy()
    expect(screen.getByText('@alice_news@example.com')).toBeTruthy()
    // The address under the handle's switch, and the account's row.
    expect(screen.getAllByText('@alice@example.com')).toHaveLength(2)
    expect(screen.getByText('alice.example.com')).toBeTruthy()
    const switches = screen.getAllByRole('switch')
    expect(switches).toHaveLength(4)
    expect(switches[0]).toHaveAttribute('aria-checked', 'true')
    expect(switches[1]).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText('@alice@mastodon.social')).toBeTruthy()
    expect(screen.getByText('Hosted')).toBeTruthy()
    expect(screen.getByText('Linked')).toBeTruthy()
    // The limit is reached, so no chooser.
    expect(screen.queryByText('Choose a handle')).toBeNull()
  })

  it('switching a network on creates the hosted account', async () => {
    state.post.mockResolvedValue({ id: 'b1' })
    show()
    await screen.findByText('Handle on example.com')
    await act(async () => {
      fireEvent.click(screen.getAllByRole('switch')[1])
    })
    await waitFor(() => expect(state.post).toHaveBeenCalled())
    expect(state.post.mock.calls[0][0]).toBe('-/user/networks/account/create')
    expect(state.post.mock.calls[0][1]).toEqual({
      network: 'bluesky',
      handle: 'alice',
      domain: 'example.com',
    })
    expect(state.success).toHaveBeenCalledWith('Account created')
  })

  it('switching a network off asks before removing the account', async () => {
    state.post.mockResolvedValue({ removed: true })
    show()
    await screen.findByText('Handle on example.com')
    await act(async () => {
      fireEvent.click(screen.getAllByRole('switch')[0])
    })
    expect(state.post).not.toHaveBeenCalled()
    expect(await screen.findByText('Remove this account?')).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    })
    await waitFor(() => expect(state.post).toHaveBeenCalled())
    expect(state.post.mock.calls[0][0]).toBe('-/user/networks/account/remove')
    expect(state.post.mock.calls[0][1]).toEqual({ id: 'f1' })
  })

  it('offers the chooser with the suggestion while a handle may be reserved', async () => {
    state.post.mockResolvedValue({
      available: true,
      reason: '',
      domain: 'example.com',
      name: 'aliceexample',
    })
    show({
      ...data,
      handles: { handles: [], limit: 1, counted: 0, unlimited: false },
      accounts: [],
    })
    await screen.findByText('Choose a handle')
    const input = screen.getByLabelText('Handle') as HTMLInputElement
    expect(input.value).toBe('aliceexample')
    await waitFor(() =>
      expect(state.post).toHaveBeenCalledWith(
        '-/user/networks/handle/available',
        { name: 'aliceexample', domain: 'example.com' },
        expect.anything()
      )
    )
    expect(await screen.findByText('Available')).toBeTruthy()
  })

  it('links an account at the remote server when its provider says oauth', async () => {
    state.post.mockResolvedValue({
      url: '/_/auth/oauth/mastodon/start?state=x',
    })
    show()
    await screen.findByText('Handle on example.com')
    await act(async () => {
      // The page header renders its actions for both layouts.
      fireEvent.click(
        screen.getAllByRole('button', { name: 'Link an account' })[0]
      )
    })
    const server = await screen.findByLabelText('Server')
    await act(async () => {
      fireEvent.change(server, { target: { value: 'mastodon.social' } })
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    })
    await waitFor(() => expect(state.navigate).toHaveBeenCalled())
    expect(state.post.mock.calls[0][0]).toBe('-/user/networks/account/link')
    expect(state.post.mock.calls[0][1]).toEqual({
      type: 'mastodon',
      server: 'mastodon.social',
    })
    expect(state.navigate).toHaveBeenCalledWith(
      '/_/auth/oauth/mastodon/start?state=x'
    )
  })

  it('says so where the server offers no networks', async () => {
    show({ ...data, offered: false, networks: [], providers: [] })
    expect(
      await screen.findByText('This server does not offer other networks.')
    ).toBeTruthy()
  })

  it('mints a password for signing in from another app and shows it once', async () => {
    state.post.mockResolvedValue({ password: 'mochi-secret' })
    const client = new QueryClient()
    render(
      <QueryClientProvider client={client}>
        <I18nProvider i18n={i18n}>
          <PasswordDialog
            account={{ ...data.accounts[0], domain: 'example.com' }}
            onOpenChange={() => {}}
          />
        </I18nProvider>
      </QueryClientProvider>
    )
    expect((screen.getByLabelText('Server') as HTMLInputElement).value).toBe(
      'https://example.com'
    )
    expect((screen.getByLabelText('Address') as HTMLInputElement).value).toBe(
      '@alice@example.com'
    )
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Device'), {
        target: { value: 'Laptop' },
      })
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Make password' }))
    })
    await waitFor(() =>
      expect(state.post).toHaveBeenCalledWith(
        '-/user/networks/account/password',
        { id: 'f1', name: 'Laptop' },
        expect.anything()
      )
    )
    expect(
      ((await screen.findByLabelText('Password')) as HTMLInputElement).value
    ).toBe('mochi-secret')
    expect(screen.queryByRole('button', { name: 'Make password' })).toBeNull()
  })

  it('lists what is blocked and muted, lifts one, and blocks a domain', async () => {
    state.post.mockResolvedValue({})
    show()
    await screen.findByText('spam.example')
    expect(screen.getByText('https://remote.example/u/troll')).toBeTruthy()
    expect(screen.getByText('https://remote.example/u/loud')).toBeTruthy()
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Unmute https://remote.example/u/loud',
        })
      )
    })
    await waitFor(() =>
      expect(state.post).toHaveBeenCalledWith(
        '-/user/networks/mute/remove',
        { actor: 'https://remote.example/u/loud' },
        expect.anything()
      )
    )
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Unblock spam.example' })
      )
    })
    await waitFor(() =>
      expect(state.post).toHaveBeenCalledWith(
        '-/user/networks/block/remove',
        { target: 'spam.example' },
        expect.anything()
      )
    )
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Domain to block'), {
        target: { value: 'worse.example' },
      })
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Block' }))
    })
    await waitFor(() =>
      expect(state.post).toHaveBeenCalledWith(
        '-/user/networks/block/add',
        { target: 'worse.example' },
        expect.anything()
      )
    )
  })

  it("sets a hosted account's aliases, one added and one removed", async () => {
    state.post.mockResolvedValue({})
    const client = new QueryClient()
    render(
      <QueryClientProvider client={client}>
        <I18nProvider i18n={i18n}>
          <AliasesDialog
            account={{ ...data.accounts[0], aliases: ['@alice@old.example'] }}
            onOpenChange={() => {}}
          />
        </I18nProvider>
      </QueryClientProvider>
    )
    expect(screen.getByText('@alice@old.example')).toBeTruthy()
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Account elsewhere'), {
        target: { value: '@alice@older.example' },
      })
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    })
    await waitFor(() =>
      expect(state.post).toHaveBeenCalledWith(
        '-/user/networks/account/aliases',
        {
          id: 'f1',
          aliases: JSON.stringify(['@alice@old.example', '@alice@older.example']),
        },
        expect.anything()
      )
    )
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Remove @alice@old.example' })
      )
    })
    await waitFor(() =>
      expect(state.post).toHaveBeenLastCalledWith(
        '-/user/networks/account/aliases',
        { id: 'f1', aliases: JSON.stringify(['@alice@older.example']) },
        expect.anything()
      )
    )
  })

  it('moves a hosted account to the address given', async () => {
    state.post.mockResolvedValue({})
    const client = new QueryClient()
    render(
      <QueryClientProvider client={client}>
        <I18nProvider i18n={i18n}>
          <MoveDialog account={data.accounts[0]} onOpenChange={() => {}} />
        </I18nProvider>
      </QueryClientProvider>
    )
    expect(screen.getByRole('button', { name: 'Move' })).toBeDisabled()
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Account to move to'), {
        target: { value: '@alice@new.example' },
      })
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Move' }))
    })
    await waitFor(() =>
      expect(state.post).toHaveBeenCalledWith(
        '-/user/networks/account/move',
        { id: 'f1', address: '@alice@new.example' },
        expect.anything()
      )
    )
  })
})
