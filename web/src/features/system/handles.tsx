// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
//
// The owner's table of every handle with its holder, where the owner releases
// handles and takes names, the protected ones included.
import { Fragment, useState } from 'react'
import { plural } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  Badge,
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  GeneralError,
  Input,
  ListSkeleton,
  Main,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  formatSystemTimestamp,
  getErrorMessage,
  naturalCompare,
  toast,
  useDebounce,
  useFormat,
  usePageTitle,
} from '@mochi/web'
import {
  AtSign,
  Ban,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react'
import { HandleChooser } from '@/features/user/networks'
import { networkLabel } from '@/lib/networks'
import {
  useSystemAccountTakedown,
  useSystemHandleRelease,
  useSystemHandles,
} from '@/hooks/use-system-networks'
import type { RegistryAccount, RegistryHandle } from '@/types/networks'

export function SystemHandles() {
  const { t } = useLingui()
  const { formatNumber } = useFormat()
  usePageTitle(t`Handles`)
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(25)
  const [offset, setOffset] = useState(0)
  const debouncedSearch = useDebounce(search, 300)

  // A new search starts at the first page, set during render, not in an
  // effect: an effect runs after the render that already asked for the old
  // page of the new search.
  const [previous, setPrevious] = useState(debouncedSearch)
  if (debouncedSearch !== previous) {
    setPrevious(debouncedSearch)
    setOffset(0)
  }

  const { data, isLoading, error, refetch } = useSystemHandles(
    limit,
    offset,
    debouncedSearch
  )
  const release = useSystemHandleRelease()
  const takedown = useSystemAccountTakedown()
  const [releasing, setReleasing] = useState<RegistryHandle | null>(null)
  const [takingDown, setTakingDown] = useState<RegistryAccount | null>(null)

  // Releasing the last handle of a page leaves offset past the end, and the
  // empty state replaces the pagination, so there would be no Previous to
  // click: step back to the last page that still has rows.
  if (data && offset > 0 && offset >= data.count) {
    setOffset(
      Math.max(0, Math.floor(Math.max(0, data.count - 1) / limit) * limit)
    )
  }

  // Taking a Bluesky account down keeps it and its records but serves
  // nothing of it and tells the relays; restoring undoes that.
  const handleTakedown = async (account: RegistryAccount, down: boolean) => {
    if (!account.did) return
    try {
      await takedown.mutateAsync({ did: account.did, down })
      toast.success(down ? t`Account taken down` : t`Account restored`)
    } catch (err) {
      toast.error(getErrorMessage(err, t`Could not change the account`))
    }
  }

  const handleRelease = async (handle: RegistryHandle) => {
    try {
      await release.mutateAsync({ name: handle.name, domain: handle.domain })
      toast.success(t`Handle released`)
    } catch (err) {
      toast.error(getErrorMessage(err, t`Could not release the handle`))
    }
  }

  // The server answers the page in the table's order: by domain, a name
  // under a handle after its handle, then by name.
  const handles = data?.handles ?? []
  // A heading names each domain, where the server has more than one.
  const headings = (data?.domains.length ?? 0) > 1

  // The page's place in the list, for the pagination line.
  const count = data?.count ?? 0
  const first = formatNumber(offset + 1)
  const last = formatNumber(Math.min(offset + limit, count))
  const total = formatNumber(count)

  return (
    <>
      <PageHeader
        title={
          <div className='flex items-center gap-2'>
            <Trans>Handles</Trans>
            {data && (
              <span className='text-muted-foreground font-normal'>
                ({formatNumber(count)})
              </span>
            )}
          </div>
        }
        icon={<AtSign className='size-4 md:size-5' />}
        actions={
          <div className='relative w-full md:w-auto'>
            <Search className='text-muted-foreground absolute start-2.5 top-2.5 h-4 w-4' />
            <Input
              placeholder={t`Search handles...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='w-full ps-8 md:w-64'
            />
          </div>
        }
      />
      <Main>
        {error ? (
          <GeneralError error={error} minimal mode='inline' reset={refetch} />
        ) : isLoading || !data ? (
          <ListSkeleton />
        ) : (
          <>
            {data.domains.length > 0 && (
              <HandleChooser
                domains={data.domains}
                suggestion=''
                title={t`Take a name`}
                onReserved={() => void refetch()}
              />
            )}
            {handles.length === 0 ? (
              <EmptyState
                icon={AtSign}
                title={
                  debouncedSearch
                    ? t`No handles match your search`
                    : t`No handles have been reserved.`
                }
                className='p-4'
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Trans>Name</Trans>
                      </TableHead>
                      <TableHead>
                        <Trans>Holder</Trans>
                      </TableHead>
                      <TableHead>
                        <Trans>Networks</Trans>
                      </TableHead>
                      <TableHead>
                        <Trans>Created</Trans>
                      </TableHead>
                      <TableHead className='w-16'></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {handles.map((handle, index) => (
                      <Fragment key={`${handle.domain}/${handle.name}`}>
                        {headings &&
                          handle.domain !== handles[index - 1]?.domain && (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className='bg-muted/50 align-top font-medium'
                              >
                                {handle.domain}
                              </TableCell>
                            </TableRow>
                          )}
                        <HandleRow
                          handle={handle}
                          onRelease={() => setReleasing(handle)}
                          onTakedown={(account) => setTakingDown(account)}
                          onRestore={(account) =>
                            void handleTakedown(account, false)
                          }
                        />
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>

                {count > limit && (
                  <div className='mt-4 flex flex-wrap items-center justify-between gap-2 py-4'>
                    <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                      <span>
                        {plural(count, {
                          one: `Showing ${first}–${last} of ${total} handle`,
                          other: `Showing ${first}–${last} of ${total} handles`,
                        })}
                      </span>
                      <Select
                        value={String(limit)}
                        onValueChange={(v) => {
                          setLimit(Number(v))
                          setOffset(0)
                        }}
                      >
                        <SelectTrigger className='h-8 w-20'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='10'>10</SelectItem>
                          <SelectItem value='25'>25</SelectItem>
                          <SelectItem value='50'>50</SelectItem>
                          <SelectItem value='100'>100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => setOffset(Math.max(0, offset - limit))}
                        disabled={offset === 0}
                      >
                        <ChevronLeft className='me-1 h-4 w-4 rtl:rotate-180' />
                        <Trans>Previous</Trans>
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => setOffset(offset + limit)}
                        disabled={offset + limit >= count}
                      >
                        <Trans>Next</Trans>
                        <ChevronRight className='ms-1 h-4 w-4 rtl:rotate-180' />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </Main>
      {takingDown && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setTakingDown(null)
          }}
          title={t`Take down ${takingDown.identifier}?`}
          desc={t`Nothing of the account is served and the relays are told. The account and what it published stay, and it can be restored.`}
          confirmText={t`Take down`}
          icon={<Ban className='size-4' />}
          destructive
          handleConfirm={async () => {
            const account = takingDown
            setTakingDown(null)
            await handleTakedown(account, true)
          }}
        />
      )}
      {releasing && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setReleasing(null)
          }}
          title={t`Release this handle?`}
          desc={t`"${releasing.name}" and the names under it will be freed for anyone to take. The holder's accounts on them, everything those published and their followers are removed.`}
          confirmText={t`Release`}
          icon={<Trash2 className='size-4' />}
          destructive
          handleConfirm={async () => {
            const handle = releasing
            setReleasing(null)
            await handleRelease(handle)
          }}
        />
      )}
    </>
  )
}

// One handle: its name, indented under the handle it belongs to, a badge for
// a community; its holder; the networks it has accounts on, a taken-down one
// in the destructive colour; when it was reserved; and the owner's actions.
function HandleRow({
  handle,
  onRelease,
  onTakedown,
  onRestore,
}: {
  handle: RegistryHandle
  onRelease: () => void
  onTakedown: (account: RegistryAccount) => void
  onRestore: (account: RegistryAccount) => void
}) {
  const { t } = useLingui()
  const accounts = [...(handle.accounts ?? [])]
    .map((account) => ({ account, label: networkLabel(account.network) }))
    .sort((a, b) => naturalCompare(a.label, b.label))
  return (
    <TableRow>
      <TableCell className='align-top font-medium'>
        <div
          className={`flex flex-wrap items-center gap-2 ${handle.parent ? 'ps-4' : ''}`}
        >
          <span>{handle.name}</span>
          {handle.kind === 'community' && (
            <Badge variant='secondary'>
              <Trans>Community</Trans>
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className='align-top'>
        <div>{handle.holder || handle.username}</div>
        {handle.holder && (
          <div className='text-muted-foreground text-sm'>{handle.username}</div>
        )}
      </TableCell>
      <TableCell className='align-top'>
        <div className='flex flex-wrap gap-x-3'>
          {accounts.map(({ account, label }) => (
            <span
              key={account.id}
              className={
                account.status === 'takendown' ? 'text-destructive' : undefined
              }
            >
              {label}
              {account.status === 'takendown' && (
                <span className='sr-only'>
                  {' '}
                  <Trans>Taken down</Trans>
                </span>
              )}
            </span>
          ))}
        </div>
      </TableCell>
      <TableCell className='text-muted-foreground align-top tabular-nums'>
        {formatSystemTimestamp(handle.created, String(handle.created))}
      </TableCell>
      <TableCell className='text-end align-top'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              icon={<MoreHorizontal className='h-4 w-4' />}
              aria-label={t`Handle actions`}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            {accounts
              .filter(({ account }) => account.did)
              .map(({ account }) =>
                account.status === 'takendown' ? (
                  <DropdownMenuItem
                    key={account.id}
                    onClick={() => onRestore(account)}
                  >
                    <RotateCcw className='me-2 h-4 w-4' />
                    <Trans>Restore {account.identifier}</Trans>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    key={account.id}
                    onClick={() => onTakedown(account)}
                  >
                    <Ban className='me-2 h-4 w-4' />
                    <Trans>Take down {account.identifier}</Trans>
                  </DropdownMenuItem>
                )
              )}
            <DropdownMenuItem onClick={onRelease}>
              <Trash2 className='me-2 h-4 w-4' />
              <Trans>Release</Trans>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
