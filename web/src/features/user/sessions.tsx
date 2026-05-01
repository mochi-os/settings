import type { Session } from '@/types/account'
import { Trans, useLingui } from '@lingui/react/macro'
import { Loader2, LogOut, Monitor } from 'lucide-react'
import { useSessions, useRevokeSession } from '@/hooks/use-account'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  EmptyState,
  GeneralError,
  ListSkeleton,
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
  toast,
  useFormat,
} from '@mochi/web'

function SessionRow({
  session,
  isCurrent,
}: {
  session: Session
  isCurrent: boolean
}) {
  const { t } = useLingui()
  const { formatTimestamp } = useFormat()
  const revokeSession = useRevokeSession()

  const handleRevoke = () => {
    revokeSession.mutate(session.id, {
      onSuccess: () => {
        toast.success(t`Session revoked`)
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
            {session.agent || 'Unknown device'}
            {isCurrent && (
              <span className='text-muted-foreground ms-2 text-xs'>
                (current)
              </span>
            )}
          </span>
        </div>
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {formatTimestamp(session.created, 'Never')}
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {formatTimestamp(session.accessed, 'Never')}
      </TableCell>
      <TableCell className='text-end'>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              disabled={revokeSession.isPending}
            >
              {revokeSession.isPending ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <LogOut className='h-4 w-4' />
              )}
              <span className='sr-only'><Trans>Revoke session</Trans></span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle><Trans>Revoke session?</Trans></AlertDialogTitle>
              <AlertDialogDescription>
                This will sign out this session. If this is your current
                session, you will need to sign in again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel><Trans>Cancel</Trans></AlertDialogCancel>
              <AlertDialogAction onClick={handleRevoke}>
                <Trans>Revoke</Trans>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}

export function UserSessions() {
  const { t } = useLingui()
  usePageTitle(t`Sessions`)
  const { data, isLoading, error, refetch } = useSessions()

  const sessions = data?.sessions ?? []
  const sortedSessions = [...sessions].sort((a, b) => b.accessed - a.accessed)

  return (
    <>
      <PageHeader title={t`Sessions`} icon={<Monitor className='size-4 md:size-5' />} />

      <Main>
        {error ? (
          <GeneralError error={error} minimal mode='inline' reset={refetch} />
        ) : isLoading ? (
          <ListSkeleton variant='simple' height='h-10' count={3} />
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={Monitor}
            title={t`No active sessions`}
            className='p-4'
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Trans>Session</Trans></TableHead>
                <TableHead><Trans>Created</Trans></TableHead>
                <TableHead><Trans>Last active</Trans></TableHead>
                <TableHead className='w-12'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSessions.map((session, index) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  isCurrent={index === 0 && session.accessed > 0}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </Main>
    </>
  )
}
