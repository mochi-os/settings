import { useState } from 'react'
import { useLingui, Trans } from '@lingui/react/macro'
import { Check, Pencil, User } from 'lucide-react'
import { useAccountData, useUpdateIdentity } from '@/hooks/use-account'
import { DataSection } from './data'
import { CloseAccountSection } from './close-account'
import {
  Button,
  Input,
  Label,
  Switch,
  ListSkeleton,
  PageHeader,
  Main,
  usePageTitle,
  Section,
  FieldRow,
  DataChip,
  GeneralError,
  toast,
  getErrorMessage,
  ServerDocumentsFooter,
} from '@mochi/web'

// ============================================================================
// Identity Section
// ============================================================================

function IdentitySection() {
  const { t } = useLingui()
  const { data, isLoading, error, refetch } = useAccountData()
  const updateIdentity = useUpdateIdentity()
  const [isRenaming, setIsRenaming] = useState(false)
  const [draftName, setDraftName] = useState('')

  const startRename = () => {
    setDraftName(data?.identity?.name ?? '')
    setIsRenaming(true)
  }

  const handleRename = () => {
    const name = draftName.trim()
    if (!name || name === data?.identity?.name) {
      setIsRenaming(false)
      return
    }
    updateIdentity.mutate(
      { name },
      {
        onSuccess: () => {
          toast.success(t`Name updated`)
          setIsRenaming(false)
        },
        onError: (err) => {
          toast.error(getErrorMessage(err, t`Failed to update name`))
        },
      }
    )
  }

  const handleTogglePublic = (checked: boolean) => {
    const privacy = checked ? 'public' : 'private'
    updateIdentity.mutate(
      { privacy },
      {
        onSuccess: () => {
          toast.success(
            privacy === 'public'
              ? t`Identity is now listed in the directory` : t`Identity is no longer listed in the directory`
          )
        },
        onError: (err) => {
          toast.error(getErrorMessage(err, t`Failed to update privacy`))
        },
      }
    )
  }

  return (
    <Section
      title={t`Identity`}
    >
      {error ? (
        <GeneralError error={error} minimal mode='inline' reset={refetch} />
      ) : isLoading ? (
        <ListSkeleton variant='simple' height='h-12' count={4} />
      ) : data?.identity ? (
        <div className='divide-y-0'>
          <FieldRow label={t`Name`}>
            {isRenaming ? (
              <div className='flex items-center gap-2'>
                <Input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className='h-8 w-64'
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename()
                    if (e.key === 'Escape') setIsRenaming(false)
                  }}
                  disabled={updateIdentity.isPending}
                />
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={handleRename}
                  disabled={updateIdentity.isPending}
                  aria-label={t`Save name`}
                >
                  <Check className='h-4 w-4' />
                </Button>
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={() => setIsRenaming(false)}
                  disabled={updateIdentity.isPending}
                >
                  <Trans>Cancel</Trans>
                </Button>
              </div>
            ) : (
              <div className='flex items-center gap-2'>
                <span className='text-foreground text-base font-semibold'>
                  {data.identity.name}
                </span>
                <Button variant='ghost' size='sm' onClick={startRename} aria-label={t`Edit name`}>
                  <Pencil className='h-4 w-4' />
                </Button>
              </div>
            )}
          </FieldRow>
          <FieldRow label={t`Username`}>
            <span className='text-foreground text-base'>
              {data.identity.username}
            </span>
          </FieldRow>
          <FieldRow label={t`Fingerprint`}>
            <DataChip value={data.identity.fingerprint} truncate='middle' />
          </FieldRow>
          <FieldRow label={t`Identity`}>
            <DataChip
              value={data.identity.entity}
              className='w-full'
              chipClassName='flex-1'
            />
          </FieldRow>
          <div className='flex items-center justify-between py-4 border-t border-border/40'>
            <Label htmlFor='identity-public' className='text-muted-foreground pe-4 text-sm font-medium'>
              <Trans>Allow others to find you in directory</Trans>
            </Label>
            <Switch
              id='identity-public'
              checked={data.identity.privacy === 'public'}
              onCheckedChange={handleTogglePublic}
              disabled={updateIdentity.isPending}
            />
          </div>
        </div>
      ) : null}
    </Section>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function UserAccount() {
  const { t } = useLingui()
  usePageTitle(t`Account`)
  // Administrators can't close their own account (a self-closed sole admin
  // would strand the server — enforced server-side too), so don't offer it.
  const { data } = useAccountData()
  const isAdministrator = data?.role === 'administrator'

  return (
    <>
      <PageHeader title={t`Account`} icon={<User className='size-4 md:size-5' />} />
      <Main>
        <div className='space-y-8 pb-6'>
          <IdentitySection />
          <DataSection />
          {!isAdministrator && <CloseAccountSection />}
        </div>
        <ServerDocumentsFooter />
      </Main>
    </>
  )
}
