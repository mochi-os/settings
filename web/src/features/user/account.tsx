// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useLingui, Trans } from '@lingui/react/macro'
import { User } from 'lucide-react'
import { useAccountData, useUpdateIdentity } from '@/hooks/use-account'
import { DataSection } from './data'
import { CloseAccountSection } from './close-account'
import {
  Label,
  Switch,
  ListSkeleton,
  PageHeader,
  Main,
  usePageTitle,
  Section,
  FieldRow,
  EditableFieldRow,
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

  const handleRename = async (name: string) => {
    try {
      await updateIdentity.mutateAsync({ name })
      toast.success(t`Name updated`)
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to update name`))
      throw err
    }
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
          <EditableFieldRow
            label={t`Name`}
            value={data.identity.name}
            onSave={handleRename}
            validate={(value) => (value.trim() ? null : t`Name is required`)}
            emphasize
          />
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
