// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { useLingui } from '@lingui/react/macro'
import {
  FLIGHT_SERVICE_NAMES,
  FieldRow,
  GeneralError,
  ListSkeleton,
  MAP_SERVICE_NAMES,
  Main,
  PageHeader,
  flightService,
  getErrorMessage,
  mapService,
  naturalCompare,
  toast,
  usePageTitle,
} from '@mochi/web'
import { ExternalLink } from 'lucide-react'
import { useLocaleBroadcast } from '@/hooks/use-locale-broadcast'
import { usePreferencesData, useSetPreference } from '@/hooks/use-preferences'
import { ComboSelect } from '@/components/combo-select'

// The services in alphabetical order, whichever is the default.
function alphabetical(names: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(names).sort(([, a], [, b]) => naturalCompare(a, b))
  )
}

const MAPS = alphabetical(MAP_SERVICE_NAMES)
const FLIGHTS = alphabetical(FLIGHT_SERVICE_NAMES)

/** Where links open: the map a location goes to, the tracker a flight goes to. */
export function UserLinks() {
  const { t } = useLingui()
  usePageTitle(t({ message: 'Links', context: 'external links' }))
  const { data, isLoading, error, refetch } = usePreferencesData()
  const setPreference = useSetPreference()
  const broadcast = useLocaleBroadcast()

  const handleChange = (key: 'maps' | 'flights', value: string) => {
    // Both outcomes come from the promise, not from per-call callbacks: a
    // second pick on this hook, or leaving the page, drops the first call's
    // callbacks, while its save still lands or is put back.
    void setPreference.mutateAsync({ [key]: value }).then(
      () => {
        // The shell carries the link preferences with the locale block, so
        // every open app learns the change without a reload.
        broadcast.change(key, value)
        toast.success(t`Preference updated`)
      },
      (error) => {
        toast.error(getErrorMessage(error, t`Failed to update preference`))
      }
    )
  }

  return (
    <>
      <PageHeader
        title={t({ message: 'Links', context: 'external links' })}
        icon={<ExternalLink className='size-4 md:size-5' />}
      />

      <Main className='space-y-6'>
        {error ? (
          <GeneralError error={error} minimal mode='inline' reset={refetch} />
        ) : isLoading ? (
          <ListSkeleton variant='simple' height='h-12' count={2} />
        ) : data ? (
          <div className='divide-y-0'>
            <FieldRow label={t`Maps`}>
              <div className='w-full'>
                <ComboSelect
                  value={mapService(data.preferences.maps)}
                  options={MAPS}
                  onChange={(value) => handleChange('maps', value)}
                  disabled={setPreference.isPending}
                />
              </div>
            </FieldRow>
            <FieldRow label={t`Flights`}>
              <div className='w-full'>
                <ComboSelect
                  value={flightService(data.preferences.flights)}
                  options={FLIGHTS}
                  onChange={(value) => handleChange('flights', value)}
                  disabled={setPreference.isPending}
                />
              </div>
            </FieldRow>
          </div>
        ) : null}
      </Main>
    </>
  )
}
