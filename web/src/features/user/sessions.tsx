// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { useState } from 'react'
import type { OtherToken, Session } from '@/types/account'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  Button,
  ConfirmDialog,
  EmptyState,
  GeneralError,
  ListSkeleton,
  Section,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  PageHeader,
  Main,
  usePageTitle,
  getErrorMessage,
  shellNavigateTop,
  toast,
  useFormat,
} from '@mochi/web'
import { LogOut, Monitor } from 'lucide-react'
import {
  useAgentName,
  useSessions,
  useRevokeSession,
  useRevokeToken,
} from '@/hooks/use-account'
import { networkLabel } from '@/lib/networks'

function SessionRow({
  session,
  isCurrent,
}: {
  session: Session
  isCurrent: boolean
}) {
  const { t } = useLingui()
  const { formatTimestamp } = useFormat()
  const agentName = useAgentName()
  const revokeSession = useRevokeSession()
  const [showRevoke, setShowRevoke] = useState(false)

  const handleRevoke = () => {
    revokeSession.mutate(session.id, {
      onSuccess: () => {
        // This page was signed in with that session, so every later request
        // is refused: go where signing in again starts.
        if (isCurrent) {
          shellNavigateTop('/')
          return
        }
        toast.success(t`Session revoked`)
        setShowRevoke(false)
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, t`Failed to revoke session`))
      },
    })
  }

  return (
    <TableRow>
      <TableCell>
        <div className='flex flex-col'>
          <span className='font-medium'>
            {agentName(session.agent)}
            {isCurrent && (
              <span className='text-muted-foreground ms-2 text-xs'>
                <Trans>(current)</Trans>
              </span>
            )}
          </span>
        </div>
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {formatTimestamp(session.created, t`Never`)}
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {formatTimestamp(session.accessed, t`Never`)}
      </TableCell>
      <TableCell className='text-end'>
        <Button
          variant='ghost'
          size='sm'
          loading={revokeSession.isPending}
          icon={<LogOut className='h-4 w-4' />}
          onClick={() => setShowRevoke(true)}
        >
          <span className='sr-only'>
            <Trans>Revoke session</Trans>
          </span>
        </Button>
        <ConfirmDialog
          open={showRevoke}
          onOpenChange={setShowRevoke}
          title={t`Revoke session?`}
          desc={t`This will sign out this session. If this is your current session, you will need to sign in again.`}
          confirmText={t`Revoke`}
          icon={<LogOut className='size-4' />}
          isLoading={revokeSession.isPending}
          handleConfirm={handleRevoke}
        />
      </TableCell>
    </TableRow>
  )
}

// A sign-in by another network's app, or a password minted for one: the
// first column names the app or the device, then the account it is for.
function TokenRow({ token }: { token: OtherToken }) {
  const { t } = useLingui()
  const { formatTimestamp } = useFormat()
  const revokeToken = useRevokeToken()
  const [showRevoke, setShowRevoke] = useState(false)

  const handleRevoke = () => {
    revokeToken.mutate(token.hash, {
      onSuccess: () => {
        toast.success(
          token.kind === 'signin' ? t`Sign-in revoked` : t`Password revoked`
        )
        setShowRevoke(false)
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, t`Could not revoke`))
      },
    })
  }

  const title =
    token.kind === 'signin'
      ? token.client.name || token.name
      : token.name || token.device

  return (
    <TableRow>
      <TableCell>
        <div className='flex flex-col'>
          <span className='font-medium'>{title}</span>
          {token.kind === 'signin' && token.device && (
            <span className='text-muted-foreground text-xs'>
              {token.device}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className='text-sm'>
        <div className='flex flex-col'>
          <span>{token.address}</span>
          <span className='text-muted-foreground text-xs'>
            {networkLabel(token.network)}
          </span>
        </div>
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {formatTimestamp(token.created, t`Never`)}
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {formatTimestamp(token.used, t`Never`)}
      </TableCell>
      <TableCell className='text-end'>
        <Button
          variant='ghost'
          size='sm'
          loading={revokeToken.isPending}
          icon={<LogOut className='h-4 w-4' />}
          onClick={() => setShowRevoke(true)}
        >
          <span className='sr-only'>
            <Trans>Revoke</Trans>
          </span>
        </Button>
        <ConfirmDialog
          open={showRevoke}
          onOpenChange={setShowRevoke}
          title={
            token.kind === 'signin'
              ? t`Revoke this sign-in?`
              : t`Revoke this password?`
          }
          desc={
            token.kind === 'signin'
              ? t`${title} will be signed out of ${token.address} and must sign in again.`
              : t`Apps signed in to ${token.address} with this password will be signed out.`
          }
          confirmText={t`Revoke`}
          icon={<LogOut className='size-4' />}
          isLoading={revokeToken.isPending}
          handleConfirm={handleRevoke}
        />
      </TableCell>
    </TableRow>
  )
}

function TokenTable({
  tokens,
  first,
}: {
  tokens: OtherToken[]
  first: React.ReactNode
}) {
  return (
    <Table stickyFirstColumn>
      <TableHeader>
        <TableRow>
          <TableHead>{first}</TableHead>
          <TableHead>
            <Trans>Account</Trans>
          </TableHead>
          <TableHead>
            <Trans>Created</Trans>
          </TableHead>
          <TableHead>
            <Trans>Last used</Trans>
          </TableHead>
          <TableHead className='w-12'></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...tokens]
          .sort((a, b) => b.used - a.used || b.created - a.created)
          .map((token) => (
            <TokenRow key={token.hash} token={token} />
          ))}
      </TableBody>
    </Table>
  )
}

export function UserSessions() {
  const { t } = useLingui()
  usePageTitle(t`Sessions`)
  const { data, isLoading, error, refetch } = useSessions()

  const sessions = data?.sessions ?? []
  const sortedSessions = [...sessions].sort((a, b) => b.accessed - a.accessed)
  const signins = data?.signins ?? []
  const passwords = data?.passwords ?? []

  return (
    <>
      <PageHeader
        title={t`Sessions`}
        icon={<Monitor className='size-4 md:size-5' />}
      />

      <Main className='space-y-8'>
        {error ? (
          <GeneralError error={error} minimal mode='inline' reset={refetch} />
        ) : isLoading ? (
          <ListSkeleton variant='simple' height='h-10' count={3} />
        ) : (
          <>
            {sessions.length === 0 ? (
              <EmptyState
                icon={Monitor}
                title={t`No active sessions`}
                className='p-4'
              />
            ) : (
              <Table stickyFirstColumn>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Trans>Session</Trans>
                    </TableHead>
                    <TableHead>
                      <Trans>Created</Trans>
                    </TableHead>
                    <TableHead>
                      <Trans>Last active</Trans>
                    </TableHead>
                    <TableHead className='w-12'></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSessions.map((session) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      isCurrent={session.current === true}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
            {signins.length > 0 && (
              <Section title={t`Apps signed in`} contentClassName='px-0 py-0'>
                <TokenTable tokens={signins} first={<Trans>App</Trans>} />
              </Section>
            )}
            {passwords.length > 0 && (
              <Section title={t`Passwords`} contentClassName='px-0 py-0'>
                <TokenTable tokens={passwords} first={<Trans>Device</Trans>} />
              </Section>
            )}
          </>
        )}
      </Main>
    </>
  )
}
