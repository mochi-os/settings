// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
//
// The owner's blocks for the whole server (the federation plan, phase 40):
// domains, and people by their address on their network, on every network.
import { useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  Button,
  GeneralError,
  Input,
  ListSkeleton,
  Main,
  PageHeader,
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
  usePageTitle,
} from '@mochi/web'
import { Ban, Loader2, Plus, Trash2 } from 'lucide-react'
import {
  useSystemBlockChange,
  useSystemBlocks,
} from '@/hooks/use-system-moderation'

export function SystemBlocks() {
  const { t } = useLingui()
  usePageTitle(t`Blocks`)
  const { data, isLoading, error, refetch } = useSystemBlocks()
  const add = useSystemBlockChange('add')
  const remove = useSystemBlockChange('remove')
  const [target, setTarget] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const run = async (
    key: string,
    call: () => Promise<unknown>,
    done: string
  ) => {
    setBusy(key)
    try {
      await call()
      toast.success(done)
      return true
    } catch (err) {
      toast.error(getErrorMessage(err, t`Could not change the block`))
      return false
    } finally {
      setBusy(null)
    }
  }

  const rows = [
    ...(data?.domains ?? []).map((b) => ({
      key: b.domain,
      person: false,
      created: b.created,
    })),
    ...(data?.people ?? []).map((b) => ({
      key: b.actor,
      person: true,
      created: b.created,
    })),
  ].sort((a, b) => naturalCompare(a.key, b.key))

  return (
    <>
      <PageHeader
        title={t`Blocks`}
        icon={<Ban className='size-4 md:size-5' />}
      />
      <Main>
        <form
          className='mb-4 flex gap-2'
          onSubmit={(event) => {
            event.preventDefault()
            const value = target.trim()
            if (!value) return
            void run('add', () => add.mutateAsync(value), t`Blocked`).then(
              (done) => {
                if (done) setTarget('')
              }
            )
          }}
        >
          <Input
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            placeholder='example.social'
            aria-label={t`Domain or person to block`}
            autoComplete='off'
          />
          <Button
            type='submit'
            variant='outline'
            disabled={busy === 'add' || !target.trim()}
          >
            {busy === 'add' ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <Plus className='size-4' />
            )}
            <Trans>Block</Trans>
          </Button>
        </form>
        {error ? (
          <GeneralError error={error} minimal mode='inline' reset={refetch} />
        ) : isLoading || !data ? (
          <ListSkeleton />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Trans>Blocked</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Kind</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Created</Trans>
                </TableHead>
                <TableHead className='w-16'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className='text-muted-foreground text-center'
                  >
                    <Trans>Nothing is blocked.</Trans>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((row) => {
                const label = row.key.replace(/^xmpp:/, '')
                return (
                  <TableRow key={row.key}>
                    <TableCell className='font-medium break-all'>
                      {label}
                    </TableCell>
                    <TableCell>
                      {row.person ? (
                        <Trans context='block kind'>Person</Trans>
                      ) : (
                        <Trans>Server</Trans>
                      )}
                    </TableCell>
                    <TableCell className='text-muted-foreground tabular-nums'>
                      {formatSystemTimestamp(row.created, String(row.created))}
                    </TableCell>
                    <TableCell className='text-end'>
                      <Button
                        variant='ghost'
                        size='sm'
                        icon={<Trash2 className='h-4 w-4' />}
                        aria-label={t`Unblock ${label}`}
                        disabled={busy === row.key}
                        onClick={() =>
                          void run(
                            row.key,
                            () => remove.mutateAsync(row.key),
                            t`Unblocked`
                          )
                        }
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Main>
    </>
  )
}
