// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SystemUsers } from './users'

const create = vi.fn()
const request = vi.fn()
const idle = { mutate: vi.fn(), isPending: false }

vi.mock('@/hooks/use-system-users', () => ({
  useSystemUsersData: () => ({
    data: { users: [], count: 0 },
    isLoading: false,
    ErrorComponent: null,
    refetch: vi.fn(),
  }),
  useCreateUser: () => ({ mutate: create, isPending: false }),
  useUpdateUser: () => idle,
  useDeleteUser: () => idle,
  useSuspendUser: () => idle,
  useActivateUser: () => idle,
  useUserSessions: () => ({
    data: undefined,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useRevokeUserSessions: () => idle,
}))

vi.mock('@/hooks/use-account', () => ({
  useAccountData: () => ({
    data: { identity: { username: 'admin@example.com' } },
  }),
  useAgentName: () => () => '',
}))

vi.mock('@/lib/use-step-up', () => ({
  useStepUp: () => ({ request, dialog: null }),
}))

// Opens the create dialog, fills it in and submits it.
function submit(role: string) {
  render(
    <I18nProvider i18n={i18n}>
      <SystemUsers />
    </I18nProvider>
  )
  // The header and the empty list each offer it; either opens the dialog.
  fireEvent.click(screen.getAllByRole('button', { name: 'Add user' })[0])
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'new@example.com' },
  })
  // The select's hidden native element carries the form value.
  const select = document.querySelector('select') as HTMLSelectElement
  fireEvent.change(select, { target: { value: role } })
  fireEvent.click(screen.getByRole('button', { name: 'Create user' }))
}

describe('Create user', () => {
  beforeEach(() => {
    i18n.load('en', {})
    i18n.activate('en')
    create.mockReset()
    request.mockReset()
  })

  it('creates an administrator only after a step-up, sending its proof', () => {
    submit('administrator')
    expect(request).toHaveBeenCalledTimes(1)
    expect(create).not.toHaveBeenCalled()

    const verified = request.mock.calls[0][0] as (token: string) => void
    verified('proof')
    expect(create).toHaveBeenCalledWith(
      { username: 'new@example.com', role: 'administrator', token: 'proof' },
      expect.anything()
    )
  })

  it('creates an ordinary user with no step-up', () => {
    submit('user')
    expect(request).not.toHaveBeenCalled()
    expect(create).toHaveBeenCalledWith(
      { username: 'new@example.com', role: 'user', token: undefined },
      expect.anything()
    )
  })
})
