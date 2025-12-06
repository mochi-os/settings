import { User } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Skeleton } from '@/components/ui/skeleton'
import { useAccountData } from '@/hooks/use-account'

export function UserAccount() {
  const { data, isLoading, error } = useAccountData()

  if (error) {
    return (
      <>
        <Header>
          <h1 className='text-lg font-semibold'>Account</h1>
        </Header>
        <Main>
          <p className='text-muted-foreground'>Failed to load account information</p>
        </Main>
      </>
    )
  }

  return (
    <>
      <Header>
        <h1 className='text-lg font-semibold'>Account</h1>
      </Header>

      <Main>
        <div className='flex items-center gap-2 mb-6'>
          <User className='h-5 w-5' />
          <h2 className='text-lg font-semibold'>Identity</h2>
        </div>
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
      </Main>
    </>
  )
}
