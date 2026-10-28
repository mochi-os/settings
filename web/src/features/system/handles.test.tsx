// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SystemHandles } from './handles'
import type {
  RegistryAccount,
  SystemHandles as SystemHandlesData,
} from '@/types/networks'

const state = vi.hoisted(() => ({
  data: null as SystemHandlesData | null,
  calls: [] as [number, number, string][],
  release: vi.fn(),
  takedown: vi.fn(),
}))

vi.mock('@mochi/web', async (original) => ({
  ...(await original<typeof import('@mochi/web')>()),
  toast: { success: vi.fn(), error: vi.fn() },
  usePageTitle: () => {},
  // The search goes to the server at once, so a test need not wait.
  useDebounce: <T,>(value: T) => value,
}))

vi.mock('@/hooks/use-system-networks', () => ({
  useSystemHandles: (limit: number, offset: number, search: string) => {
    state.calls.push([limit, offset, search])
    return { data: state.data, isLoading: false, error: null, refetch: vi.fn() }
  },
  useSystemHandleRelease: () => ({
    mutateAsync: state.release,
    isPending: false,
  }),
  useSystemAccountTakedown: () => ({
    mutateAsync: state.takedown,
    isPending: false,
  }),
}))

// The chooser is the Networks page's, tested there; here only its heading
// matters.
vi.mock('@/features/user/networks', () => ({
  HandleChooser: ({ title }: { title?: string }) => <div>{title}</div>,
}))

const registry = (
  name: string,
  parent: string,
  holder: string,
  username: string,
  kind = 'handle',
  accounts: RegistryAccount[] = [],
  domain = 'example.com'
) => ({
  domain,
  name,
  parent,
  kind,
  created: 1700000000,
  addresses: { fediverse: `${name}@${domain}` },
  user: `u-${username}`,
  username,
  holder,
  accounts,
})

const page = (
  handles: ReturnType<typeof registry>[],
  count = handles.length,
  domains = ['example.com']
): SystemHandlesData => ({ handles, count, domains })

function show(data: SystemHandlesData) {
  state.data = data
  return render(
    <I18nProvider i18n={i18n}>
      <SystemHandles />
    </I18nProvider>
  )
}

const lastCall = () => state.calls[state.calls.length - 1]

describe('System handles', () => {
  beforeEach(() => {
    i18n.load('en', {})
    i18n.activate('en')
    state.calls = []
    state.release.mockReset()
    state.takedown.mockReset()
  })

  it("names a handle's networks, and takes a Bluesky account down or restores it", async () => {
    state.takedown.mockResolvedValue({})
    // The menu opens on pointer down, as Radix listens for it.
    const open = async (trigger: HTMLElement) => {
      await act(async () => {
        fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false })
      })
    }
    show(
      page([
        registry('alice', '', 'Alice', 'alice@example.com', 'handle', [
          {
            id: 'f1',
            network: 'fediverse',
            identifier: '@alice@example.com',
          },
          {
            id: 'b1',
            network: 'bluesky',
            identifier: 'alice.example.com',
            did: 'did:plc:aaaaaaaaaaaaaaaaaaaaaaaa',
          },
        ]),
        registry('bob', '', 'Bob', 'bob@example.com', 'handle', [
          {
            id: 'b2',
            network: 'bluesky',
            identifier: 'bob.example.com',
            did: 'did:plc:bbbbbbbbbbbbbbbbbbbbbbbb',
            status: 'takendown',
          },
        ]),
      ])
    )
    // The networks by name only, sorted; the addresses are not listed.
    const rows = document.querySelectorAll('tbody tr')
    const networks = (row: Element) =>
      [
        ...row
          .querySelectorAll('td')[2]
          .querySelectorAll(':scope > div > span'),
      ].map((span) => span.textContent)
    expect(networks(rows[0])).toEqual(['Bluesky', 'Fediverse'])
    expect(screen.queryByText(/@alice@example.com/)).toBeNull()
    // A taken-down account's network is in the destructive colour, and
    // says so to a screen reader.
    const down = rows[1].querySelectorAll('td')[2].querySelector('span')!
    expect(down.className).toContain('text-destructive')
    expect(down.textContent).toBe('Bluesky Taken down')
    expect(down.querySelector('.sr-only')?.textContent).toBe(' Taken down')
    expect(
      rows[0].querySelectorAll('td')[2].querySelector('.text-destructive')
    ).toBeNull()

    // Taking down asks first; only a Bluesky account is offered.
    await open(screen.getAllByRole('button', { name: 'Handle actions' })[0])
    const item = await screen.findByRole('menuitem', {
      name: 'Take down alice.example.com',
    })
    expect(
      screen.queryByRole('menuitem', { name: /Take down @alice/ })
    ).toBeNull()
    await act(async () => {
      fireEvent.click(item)
    })
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Take down' }))
    })
    await waitFor(() =>
      expect(state.takedown).toHaveBeenCalledWith({
        did: 'did:plc:aaaaaaaaaaaaaaaaaaaaaaaa',
        down: true,
      })
    )

    // Restoring is one step.
    await open(screen.getAllByRole('button', { name: 'Handle actions' })[1])
    await act(async () => {
      fireEvent.click(
        await screen.findByRole('menuitem', { name: 'Restore bob.example.com' })
      )
    })
    await waitFor(() =>
      expect(state.takedown).toHaveBeenLastCalledWith({
        did: 'did:plc:bbbbbbbbbbbbbbbbbbbbbbbb',
        down: false,
      })
    )
  })

  it('lists each handle with its holder, a name under a handle indented and a community badged', () => {
    show(
      page([
        registry('admin', '', 'Root', 'root@example.com'),
        registry('alice', '', 'Alice', 'alice@example.com'),
        registry('alice_news', 'alice', 'Alice', 'alice@example.com'),
        registry('books', '', '', 'bob@example.com', 'community'),
      ])
    )
    expect(screen.getByText('admin')).toBeTruthy()
    expect(screen.getByText('Root')).toBeTruthy()
    expect(screen.getAllByText('alice@example.com')).toHaveLength(2)
    // A holder with no person entity shows by username alone.
    expect(screen.getByText('bob@example.com')).toBeTruthy()
    expect(screen.getByText('Take a name')).toBeTruthy()
    // The columns are name, holder, networks, created and the menu; no
    // domain or kind.
    expect(
      [...document.querySelectorAll('thead th')].map((th) => th.textContent)
    ).toEqual(['Name', 'Holder', 'Networks', 'Created', ''])
    expect(screen.queryByText('example.com')).toBeNull()
    expect(screen.queryByText('Handle')).toBeNull()
    expect(screen.queryByText(/Name under/)).toBeNull()
    // The name under a handle is indented; the handle is not.
    const name = (text: string) => screen.getByText(text).parentElement!
    expect(name('alice_news').className).toContain('ps-4')
    expect(name('alice').className).not.toContain('ps-4')
    // A community carries a badge after its name, a handle none.
    expect(name('books').textContent).toBe('booksCommunity')
    expect(screen.getAllByText('Community')).toHaveLength(1)
    // Rows are top-aligned, so a two-line holder leaves the other cells at
    // the top rather than floating mid-row.
    const cells = document.querySelectorAll('tbody td')
    expect(cells.length).toBe(20)
    for (const cell of cells) {
      expect(cell.className).toContain('align-top')
      expect(cell.className).not.toContain('align-middle')
    }
  })

  it('heads each domain where the server has more than one', () => {
    const handles = [
      registry(
        'carol',
        '',
        'Carol',
        'carol@a.example',
        'handle',
        [],
        'a.example'
      ),
      registry('alice', '', 'Alice', 'alice@example.com'),
      registry('bob', '', 'Bob', 'bob@example.com'),
    ]
    const { unmount } = show(page(handles, 3, ['a.example', 'example.com']))
    const rows = [...document.querySelectorAll('tbody tr')].map(
      (row) => row.textContent
    )
    expect(rows[0]).toBe('a.example')
    expect(rows[1]).toContain('carol')
    expect(rows[2]).toBe('example.com')
    expect(rows[3]).toContain('alice')
    expect(rows[4]).toContain('bob')
    expect(rows).toHaveLength(5)
    unmount()
    show(page(handles.slice(1), 2, ['example.com']))
    expect(document.querySelectorAll('tbody tr')).toHaveLength(2)
    expect(screen.queryByText('example.com')).toBeNull()
  })

  it('searches the server, from the first page', async () => {
    const handles = Array.from({ length: 25 }, (_, i) =>
      registry(`name${i}`, '', '', 'root@example.com')
    )
    show(page(handles, 60))
    expect(lastCall()).toEqual([25, 0, ''])
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Next/ }))
    })
    expect(lastCall()).toEqual([25, 25, ''])
    await act(async () => {
      fireEvent.change(screen.getAllByPlaceholderText('Search handles...')[0], {
        target: { value: 'ali' },
      })
    })
    expect(lastCall()).toEqual([25, 0, 'ali'])
  })

  it('pages through the handles', async () => {
    const handles = Array.from({ length: 25 }, (_, i) =>
      registry(`name${i}`, '', '', 'root@example.com')
    )
    show(page(handles, 60))
    expect(screen.getByText('Showing 1–25 of 60 handles')).toBeTruthy()
    expect(screen.getByText('(60)')).toBeTruthy()
    const previous = screen.getByRole('button', { name: /Previous/ })
    const next = screen.getByRole('button', { name: /Next/ })
    expect((previous as HTMLButtonElement).disabled).toBe(true)
    await act(async () => {
      fireEvent.click(next)
    })
    await act(async () => {
      fireEvent.click(next)
    })
    expect(lastCall()).toEqual([25, 50, ''])
    expect(screen.getByText('Showing 51–60 of 60 handles')).toBeTruthy()
    expect((next as HTMLButtonElement).disabled).toBe(true)
    await act(async () => {
      fireEvent.click(previous)
    })
    expect(lastCall()).toEqual([25, 25, ''])
  })

  it('changes the page size from the first page', async () => {
    // The page size is a Radix select, which jsdom lacks the pointer and
    // scroll calls for.
    Element.prototype.hasPointerCapture ??= () => false
    Element.prototype.releasePointerCapture ??= () => {}
    Element.prototype.scrollIntoView ??= () => {}
    const handles = Array.from({ length: 25 }, (_, i) =>
      registry(`name${i}`, '', '', 'root@example.com')
    )
    show(page(handles, 60))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Next/ }))
    })
    expect(lastCall()).toEqual([25, 25, ''])
    await act(async () => {
      fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' })
    })
    await act(async () => {
      fireEvent.click(await screen.findByRole('option', { name: '10' }))
    })
    expect(lastCall()).toEqual([10, 0, ''])
  })

  it('steps back a page when its last handle goes', async () => {
    const handles = Array.from({ length: 25 }, (_, i) =>
      registry(`name${i}`, '', '', 'root@example.com')
    )
    const { rerender } = show(page(handles, 26))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Next/ }))
    })
    expect(lastCall()).toEqual([25, 25, ''])
    state.data = page([], 25)
    rerender(
      <I18nProvider i18n={i18n}>
        <SystemHandles />
      </I18nProvider>
    )
    expect(lastCall()).toEqual([25, 0, ''])
  })

  it('shows no pages for a single one', () => {
    show(page([registry('alice', '', 'Alice', 'alice@example.com')]))
    expect(screen.queryByRole('button', { name: /Next/ })).toBeNull()
    expect(screen.queryByText(/Showing/)).toBeNull()
  })

  it('says when nothing is reserved, or nothing matches', async () => {
    show(page([]))
    expect(screen.getByText('No handles have been reserved.')).toBeTruthy()
    await act(async () => {
      fireEvent.change(screen.getAllByPlaceholderText('Search handles...')[0], {
        target: { value: 'zzz' },
      })
    })
    expect(screen.getByText('No handles match your search')).toBeTruthy()
  })

  it('offers no chooser without a domain to reserve on', () => {
    show(page([], 0, []))
    expect(screen.queryByText('Take a name')).toBeNull()
  })
})
