// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConnectedAccounts } from './connected-accounts'

type Add = (
  type: string,
  fields: Record<string, string>,
  existing: boolean,
  initial?: boolean
) => Promise<void>

const state = vi.hoisted(() => ({
  add: vi.fn(),
  update: vi.fn(),
  post: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  // The promise the add form's submit handler awaits.
  added: null as Promise<void> | null,
}))

const claude = {
  id: 'a1',
  type: 'claude',
  label: 'Work Claude',
  identifier: '',
  created: 0,
  verified: 1,
  enabled: 1,
  default: '',
}

vi.mock('@mochi/web', async (original) => {
  const actual = await original<typeof import('@mochi/web')>()
  return {
    ...actual,
    toast: { success: state.success, error: state.error },
    requestHelpers: {
      ...actual.requestHelpers,
      get: vi.fn().mockResolvedValue([]),
      post: state.post,
    },
    useAccounts: () => ({
      providers: [{ type: 'claude', label: 'Claude', fields: [] }],
      accounts: [claude],
      isLoading: false,
      providersError: null,
      accountsError: null,
      add: state.add,
      remove: vi.fn(),
      update: state.update,
      verify: vi.fn(),
      test: vi.fn(),
      isAdding: false,
      isVerifying: false,
      refetch: vi.fn(),
    }),
    // The real form is lib/web's; this stands in for its submit.
    AccountAdd: ({ open, onAdd }: { open: boolean; onAdd: Add }) =>
      open ? (
        <button
          onClick={() => {
            state.added = onAdd('claude', { key: 'k' }, true, true)
          }}
        >
          Submit add
        </button>
      ) : null,
  }
})

vi.mock('@/hooks/use-account', () => ({
  useOauthLink: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('@/lib/use-step-up', () => ({
  useStepUp: () => ({ request: vi.fn(), dialog: null }),
}))

function show() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider i18n={i18n}>
        <ConnectedAccounts />
      </I18nProvider>
    </QueryClientProvider>
  )
}

async function addAsDefault() {
  show()
  fireEvent.click(screen.getAllByRole('button', { name: /Add account/ })[0])
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Submit add' }))
  })
}

const messages = (spy: ReturnType<typeof vi.fn>) =>
  spy.mock.calls.map((call) => String(call[0]))

describe('Adding an account', () => {
  beforeEach(() => {
    for (const spy of [state.add, state.update, state.post, state.success, state.error])
      spy.mockReset()
    state.added = null
  })

  it('closes and reports only the default when setting it as default fails', async () => {
    state.add.mockResolvedValue({ ...claude, id: 'a2' })
    state.post.mockRejectedValue(new Error('refused'))
    await addAsDefault()
    await expect(state.added).resolves.toBeUndefined()
    expect(messages(state.success)).toEqual(['Account added'])
    expect(messages(state.error)).toEqual(['refused'])
    // The account exists, so the form is gone rather than inviting a second Add.
    expect(screen.queryByRole('button', { name: 'Submit add' })).toBeNull()
  })

  it('reports a failed add without leaving a rejection behind', async () => {
    state.add.mockRejectedValue(new Error('bad key'))
    await addAsDefault()
    await expect(state.added).resolves.toBeUndefined()
    expect(messages(state.error)).toEqual(['bad key'])
    expect(state.post).not.toHaveBeenCalled()
    // Nothing was added, so the form stays for another try.
    expect(
      screen.getByRole('button', { name: 'Submit add' })
    ).toBeInTheDocument()
  })
})

describe('Account settings', () => {
  beforeEach(() => {
    state.update.mockReset()
    state.success.mockReset()
  })

  it('can be saved only once while the save runs', async () => {
    let finish: () => void = () => {}
    state.update.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve
      })
    )
    show()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Actions' }), {
      key: 'Enter',
    })
    fireEvent.click(screen.getByRole('menuitem', { name: /Settings/ }))
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Home Claude' },
    })
    const save = screen.getByRole('button', { name: /Save/ })
    await act(async () => {
      fireEvent.click(save)
    })
    expect(save).toBeDisabled()
    await act(async () => {
      fireEvent.click(save)
    })
    expect(state.update).toHaveBeenCalledTimes(1)
    await act(async () => finish())
  })
})
