// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
//
// The owner's table of every handle with its holder, where the owner releases
// handles and takes names, the protected ones included.
import { useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  GeneralError,
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
import { AtSign, MoreHorizontal, Trash2 } from 'lucide-react'
import { HandleChooser } from '@/features/user/networks'
import {
  useSystemHandleRelease,
  useSystemHandles,
} from '@/hooks/use-system-networks'
import type { RegistryHandle } from '@/types/networks'

export function SystemHandles() {
  const { t } = useLingui()
  usePageTitle(t`Handles`)
  const { data, isLoading, error, refetch } = useSystemHandles()
  const release = useSystemHandleRelease()
  const [releasing, setReleasing] = useState<RegistryHandle | null>(null)

  const handles = [...(data?.handles ?? [])].sort(
    (a, b) =>
      naturalCompare(a.domain, b.domain) ||
      naturalCompare(a.parent || a.name, b.parent || b.name) ||
      naturalCompare(a.name, b.name)
  )

  const handleRelease = async (handle: RegistryHandle) => {
    try {
      await release.mutateAsync({ name: handle.name, domain: handle.domain })
      toast.success(t`Handle released`)
    } catch (err) {
      toast.error(getErrorMessage(err, t`Could not release the handle`))
    }
  }

  return (
    <>
      <PageHeader
        title={t`Handles`}
        icon={<AtSign className='size-4 md:size-5' />}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Trans>Name</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Domain</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Kind</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Holder</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Created</Trans>
                  </TableHead>
                  <TableHead className='w-16'></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {handles.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className='text-muted-foreground text-center'
                    >
                      <Trans>No handles have been reserved.</Trans>
                    </TableCell>
                  </TableRow>
                )}
                {handles.map((handle) => (
                  <TableRow key={`${handle.domain}/${handle.name}`}>
                    <TableCell className='font-medium'>
                      {handle.parent ? (
                        <span className='ps-4'>{handle.name}</span>
                      ) : (
                        handle.name
                      )}
                    </TableCell>
                    <TableCell className='text-muted-foreground'>
                      {handle.domain}
                    </TableCell>
                    <TableCell>
                      {handle.kind === 'community' ? (
                        <Trans>Community</Trans>
                      ) : handle.parent ? (
                        <Trans>Name under {handle.parent}</Trans>
                      ) : (
                        <Trans>Handle</Trans>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>{handle.holder || handle.username}</div>
                      {handle.holder && (
                        <div className='text-muted-foreground text-sm'>
                          {handle.username}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className='text-muted-foreground tabular-nums'>
                      {formatSystemTimestamp(
                        handle.created,
                        String(handle.created)
                      )}
                    </TableCell>
                    <TableCell className='text-end'>
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
                          <DropdownMenuItem onClick={() => setReleasing(handle)}>
                            <Trash2 className='me-2 h-4 w-4' />
                            <Trans>Release</Trans>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </Main>
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
