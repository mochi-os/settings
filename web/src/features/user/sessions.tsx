import type { Session } from '@/types/account'
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
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  usePageTitle,
  getErrorMessage,
  toast,
  formatTimestamp,
} from '@mochi/common'

function SessionRow({
  session,
  isCurrent,
}: {
  session: Session
  isCurrent: boolean
}) {
  const revokeSession = useRevokeSession()

  const handleRevoke = () => {
    revokeSession.mutate(session.code, {
      onSuccess: () => {
        toast.success('Session revoked')
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to revoke session'))
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
              <span className='text-muted-foreground ml-2 text-xs'>
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
      <TableCell className='text-right'>
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
              <span className='sr-only'>Revoke session</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke session?</AlertDialogTitle>
              <AlertDialogDescription>
                This will sign out this session. If this is your current
                session, you will need to sign in again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRevoke}>
                Revoke
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}

export function UserSessions() {
  usePageTitle('Sessions')
  const { data, isLoading, error } = useSessions()

  if (error) {
    return (
      <>
        <PageHeader title="Sessions" icon={<Monitor className='size-4 md:size-5' />} />
        <Main>
          <GeneralError error={error} minimal mode='inline' />
        </Main>
      </>
    )
  }

  const sessions = data?.sessions ?? []
  const sortedSessions = [...sessions].sort((a, b) => b.accessed - a.accessed)

  return (
    <>
      <PageHeader title="Sessions" icon={<Monitor className='size-4 md:size-5' />} />

      <Main>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Monitor className='h-5 w-5' />
              Active Sessions
            </CardTitle>
            <CardDescription>
              Manage your active sessions across different devices
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ListSkeleton variant='simple' height='h-10' count={3} />
            ) : sessions.length === 0 ? (
              <EmptyState
                icon={Monitor}
                title='No active sessions'
                description='Your active sessions will appear here.'
                className='py-8'
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last active</TableHead>
                    <TableHead className='w-12'></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSessions.map((session, index) => (
                    <SessionRow
                      key={session.code}
                      session={session}
                      isCurrent={index === 0 && session.accessed > 0}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
