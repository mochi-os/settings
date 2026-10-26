// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { SystemBlocks as SystemBlocksData } from '@/types/moderation'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SystemBlocks } from './blocks'

const state = vi.hoisted(() => ({
  data: null as SystemBlocksData | null,
  add: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@mochi/web', async (original) => ({
  ...(await original<typeof import('@mochi/web')>()),
  toast: { success: vi.fn(), error: vi.fn() },
  usePageTitle: () => {},
}))

vi.mock('@/hooks/use-system-moderation', () => ({
  useSystemBlocks: () => ({
    data: state.data,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useSystemBlockChange: (action: 'add' | 'remove') => ({
    mutateAsync: action === 'add' ? state.add : state.remove,
    isPending: false,
  }),
}))

function show(data: SystemBlocksData) {
  state.data = data
  render(
    <I18nProvider i18n={i18n}>
      <SystemBlocks />
    </I18nProvider>
  )
}

describe('System blocks', () => {
  beforeEach(() => {
    i18n.load('en', {})
    i18n.activate('en')
    state.add.mockReset()
    state.remove.mockReset()
  })

  it('lists servers and people, an XMPP address without its scheme', () => {
    show({
      domains: [{ domain: 'spam.example', created: 1700000000 }],
      people: [
        { actor: 'xmpp:troll@chat.example', created: 1700000000 },
        { actor: '@bot:matrix.example', created: 1700000000 },
      ],
    })
    expect(screen.getByText('spam.example')).toBeTruthy()
    expect(screen.getByText('troll@chat.example')).toBeTruthy()
    expect(screen.getByText('@bot:matrix.example')).toBeTruthy()
    expect(screen.getByText('Server')).toBeTruthy()
    expect(screen.getAllByText('Person')).toHaveLength(2)
  })

  it('blocks what is typed and lifts a block by its full address', async () => {
    state.add.mockResolvedValue({ domains: [], people: [] })
    state.remove.mockResolvedValue({ domains: [], people: [] })
    show({
      domains: [],
      people: [{ actor: 'xmpp:troll@chat.example', created: 1700000000 }],
    })
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Domain or person to block' }),
      {
        target: { value: ' spam.example ' },
      }
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Block' }))
    })
    await waitFor(() => expect(state.add).toHaveBeenCalledWith('spam.example'))
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Unblock troll@chat.example' })
      )
    })
    await waitFor(() =>
      expect(state.remove).toHaveBeenCalledWith('xmpp:troll@chat.example')
    )
  })

  it('says when nothing is blocked', () => {
    show({ domains: [], people: [] })
    expect(screen.getByText('Nothing is blocked.')).toBeTruthy()
  })
})
