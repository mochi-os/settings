// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { Report } from '@/types/moderation'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SystemReports } from './reports'

const state = vi.hoisted(() => ({
  reports: [] as Report[],
  search: { state: 'open' } as { state?: 'open' | 'resolved' },
  resolve: vi.fn(),
  navigate: vi.fn(),
  stepUp: vi.fn(),
}))

vi.mock('@mochi/web', async (original) => ({
  ...(await original<typeof import('@mochi/web')>()),
  toast: { success: vi.fn(), error: vi.fn() },
  usePageTitle: () => {},
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => state.navigate,
}))

vi.mock('@/routes/_authenticated/system/reports', () => ({
  Route: { useSearch: () => state.search },
}))

vi.mock('@/lib/use-step-up', () => ({
  useStepUp: () => ({ request: state.stepUp, dialog: null }),
}))

vi.mock('@/hooks/use-system-moderation', () => ({
  useSystemReports: () => ({
    data: { reports: state.reports },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useSystemReportResolve: () => ({
    mutateAsync: state.resolve,
    isPending: false,
  }),
}))

const flag: Report = {
  id: 'r1',
  network: 'fediverse',
  reporter: {
    id: 'https://remote.example/actor',
    name: 'remote.example',
    blockable: true,
    host: 'remote.example',
  },
  person: {
    id: 'https://example.com/~f1',
    name: '@alice@example.com',
    blockable: false,
    host: '',
  },
  user: 'u-alice',
  account: { username: 'alice@example.com', status: 'active' },
  room: null,
  objects: ['https://example.com/~f1/notes/1', 'stanza-1'],
  category: 'spam',
  comment: 'Selling things',
  content: 'Buy now',
  created: 1700000000,
  resolved: 0,
  outcome: '',
}

function show(reports: Report[]) {
  state.reports = reports
  render(
    <I18nProvider i18n={i18n}>
      <SystemReports />
    </I18nProvider>
  )
}

// The menu opens on pointer down, as Radix listens for it.
async function open(trigger: HTMLElement) {
  await act(async () => {
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false })
  })
}

describe('System reports', () => {
  beforeEach(() => {
    i18n.load('en', {})
    i18n.activate('en')
    state.search = { state: 'open' }
    state.resolve.mockReset()
    state.resolve.mockResolvedValue({})
    state.navigate.mockReset()
    state.stepUp.mockReset()
  })

  it('shows who reported whom, why, the reported text and links to what was complained of', () => {
    show([flag])
    expect(screen.getByText('remote.example')).toBeTruthy()
    expect(screen.getByText('@alice@example.com')).toBeTruthy()
    expect(screen.getByText('alice@example.com')).toBeTruthy()
    expect(screen.getByText('Spam')).toBeTruthy()
    expect(screen.getByText('Selling things')).toBeTruthy()
    expect(screen.getByText('Buy now')).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'https://example.com/~f1/notes/1' })
    ).toBeTruthy()
    // An id that is no address is not offered as a link.
    expect(screen.queryByText('stanza-1')).toBeNull()
  })

  it("offers to block the reporter's server, never someone here", async () => {
    show([flag])
    await open(screen.getByRole('button', { name: 'Report actions' }))
    expect(
      await screen.findByRole('menuitem', {
        name: 'Block server remote.example',
      })
    ).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: /^Block @alice/ })).toBeNull()
    expect(
      screen.queryByRole('menuitem', { name: 'Block remote.example' })
    ).toBeNull()

    // Blocking asks first, then resolves the report with what was blocked.
    await act(async () => {
      fireEvent.click(
        screen.getByRole('menuitem', { name: 'Block server remote.example' })
      )
    })
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Block' }))
    })
    await waitFor(() =>
      expect(state.resolve).toHaveBeenCalledWith({
        id: 'r1',
        outcome: 'blocked',
        target: 'remote.example',
      })
    )
  })

  it('offers to block a reported person on another server, and their server', async () => {
    show([
      {
        ...flag,
        reporter: {
          id: 'https://example.com/~f1',
          name: '@alice@example.com',
          blockable: false,
          host: '',
        },
        person: {
          id: 'https://spam.example/users/bot',
          name: '@bot@spam.example',
          blockable: true,
          host: 'spam.example',
        },
        user: '',
        account: undefined,
      },
    ])
    await open(screen.getByRole('button', { name: 'Report actions' }))
    await act(async () => {
      fireEvent.click(
        await screen.findByRole('menuitem', {
          name: 'Block @bot@spam.example',
        })
      )
    })
    expect(
      screen.getByText(
        "Nothing they send reaches anyone on this server, and they are no longer anyone's follower here."
      )
    ).toBeTruthy()
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Block' }))
    })
    await waitFor(() =>
      expect(state.resolve).toHaveBeenCalledWith({
        id: 'r1',
        outcome: 'blocked',
        target: 'https://spam.example/users/bot',
      })
    )
    await open(screen.getByRole('button', { name: 'Report actions' }))
    expect(
      await screen.findByRole('menuitem', {
        name: 'Block server spam.example',
      })
    ).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: 'Suspend user' })).toBeNull()
  })

  it('suspends the user only after a step-up', async () => {
    state.stepUp.mockImplementation((run: (token: string) => void) =>
      run('proof')
    )
    show([flag])
    await open(screen.getByRole('button', { name: 'Report actions' }))
    await act(async () => {
      fireEvent.click(
        await screen.findByRole('menuitem', { name: 'Suspend user' })
      )
    })
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Suspend' }))
    })
    await waitFor(() =>
      expect(state.resolve).toHaveBeenCalledWith({
        id: 'r1',
        outcome: 'suspended',
        token: 'proof',
      })
    )
    expect(state.stepUp).toHaveBeenCalled()
  })

  it('offers a server both parties are on once, and no suspension of a user already suspended', async () => {
    show([
      {
        ...flag,
        person: {
          id: 'https://remote.example/users/bot',
          name: '@bot@remote.example',
          blockable: true,
          host: 'remote.example',
        },
        account: { username: 'alice@example.com', status: 'suspended' },
      },
    ])
    await open(screen.getByRole('button', { name: 'Report actions' }))
    expect(
      await screen.findAllByRole('menuitem', {
        name: 'Block server remote.example',
      })
    ).toHaveLength(1)
    expect(screen.queryByRole('menuitem', { name: 'Suspend user' })).toBeNull()
  })

  it('dismisses in one step', async () => {
    show([flag])
    await open(screen.getByRole('button', { name: 'Report actions' }))
    await act(async () => {
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Dismiss' }))
    })
    await waitFor(() =>
      expect(state.resolve).toHaveBeenCalledWith({
        id: 'r1',
        outcome: 'dismissed',
      })
    )
  })

  it('offers no suspension of a user already suspended, and names a room by its name', async () => {
    show([
      {
        ...flag,
        id: 'r2',
        network: 'matrix',
        reporter: {
          id: '@bob:example.com',
          name: '@bob:example.com',
          blockable: false,
          host: '',
        },
        person: null,
        user: '',
        account: undefined,
        room: { id: '!room:remote.example', name: 'Lobby' },
        objects: [],
      },
    ])
    expect(screen.getByText('Lobby')).toBeTruthy()
    expect(screen.queryByText('!room:remote.example')).toBeNull()
    await open(screen.getByRole('button', { name: 'Report actions' }))
    await screen.findByRole('menuitem', { name: 'Dismiss' })
    expect(screen.queryByRole('menuitem', { name: 'Suspend user' })).toBeNull()
  })

  it('shows how a resolved report was resolved, and keeps the tab in the address', async () => {
    state.search = { state: 'resolved' }
    show([{ ...flag, resolved: 1700000500, outcome: 'blocked' }])
    expect(screen.getByText('Blocked')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Report actions' })).toBeNull()
    await act(async () => {
      fireEvent.mouseDown(screen.getByRole('tab', { name: 'Open' }))
    })
    expect(state.navigate).toHaveBeenCalledWith({
      to: '/system/reports',
      search: { state: 'open' },
      replace: true,
    })
  })

  it('says when no report is waiting', () => {
    show([])
    expect(screen.getByText('No reports are waiting.')).toBeTruthy()
  })
})
