import { formatDistanceToNow } from 'date-fns'
import { Loader2, LogOut, User } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
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
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAccountData, useRevokeSession } from '@/hooks/use-account'
import type { Session } from '@/types/account'

function formatTimestamp(timestamp: number): string {
  if (timestamp === 0) return 'Never'
  return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true })
}

function IdentityCard() {
  const { data, isLoading, error } = useAccountData()

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
          <CardDescription>Failed to load identity information</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <User className='h-5 w-5' />
          Identity
        </CardTitle>
        <CardDescription>Your account identity information</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className='space-y-3'>
            <Skeleton className='h-4 w-48' />
            <Skeleton className='h-4 w-64' />
            <Skeleton className='h-4 w-32' />
          </div>
        ) : data ? (
          <dl className='grid gap-3 text-sm'>
            <div className='flex flex-col gap-1 sm:flex-row sm:gap-4'>
              <dt className='text-muted-foreground w-28 shrink-0'>Name</dt>
              <dd className='font-medium'>{data.identity.name}</dd>
            </div>
            <div className='flex flex-col gap-1 sm:flex-row sm:gap-4'>
              <dt className='text-muted-foreground w-28 shrink-0'>Username</dt>
              <dd className='font-medium'>{data.identity.username}</dd>
            </div>
            <div className='flex flex-col gap-1 sm:flex-row sm:gap-4'>
              <dt className='text-muted-foreground w-28 shrink-0'>Fingerprint</dt>
              <dd className='font-mono text-xs'>{data.identity.fingerprint}</dd>
            </div>
            <div className='flex flex-col gap-1 sm:flex-row sm:gap-4'>
              <dt className='text-muted-foreground w-28 shrink-0'>Entity ID</dt>
              <dd className='font-mono text-xs break-all'>{data.identity.entity}</dd>
            </div>
          </dl>
        ) : null}
      </CardContent>
    </Card>
  )
}

function SessionRow({ session, isCurrent }: { session: Session; isCurrent: boolean }) {
  const revokeSession = useRevokeSession()

  const handleRevoke = () => {
    revokeSession.mutate(session.code, {
      onSuccess: () => {
        toast.success('Session revoked')
      },
      onError: () => {
        toast.error('Failed to revoke session')
      },
    })
  }

  return (
    <TableRow>
      <TableCell>
        <div className='flex flex-col'>
          <span className='font-medium'>
            {session.name || 'Unnamed session'}
            {isCurrent && (
              <span className='text-muted-foreground ml-2 text-xs'>(current)</span>
            )}
          </span>
          {session.agent && (
            <span className='text-muted-foreground text-xs'>{session.agent}</span>
          )}
        </div>
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {formatTimestamp(session.created)}
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {formatTimestamp(session.accessed)}
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
                This will sign out this session. If this is your current session,
                you will need to sign in again.
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

function SessionsCard() {
  const { data, isLoading, error } = useAccountData()

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>Failed to load sessions</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const sessions = data?.sessions ?? []
  const sortedSessions = [...sessions].sort((a, b) => b.accessed - a.accessed)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sessions</CardTitle>
        <CardDescription>
          Manage your active sessions. You can revoke any session to sign it out.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className='space-y-3'>
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-10 w-full' />
          </div>
        ) : sessions.length === 0 ? (
          <p className='text-muted-foreground text-sm'>No active sessions</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Active</TableHead>
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
  )
}

export function UserAccount() {
  return (
    <>
      <Header>
        <h1 className='text-lg font-semibold'>Account</h1>
      </Header>

      <Main>
        <div className='space-y-6'>
          <IdentityCard />
          <SessionsCard />
        </div>
      </Main>
    </>
  )
}
