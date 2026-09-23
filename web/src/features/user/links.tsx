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
  shellSetLocale,
  toast,
  useLocale,
  usePageTitle,
  type LocalePreferences,
} from '@mochi/web'
import { ExternalLink } from 'lucide-react'
import { usePreferencesData, useSetPreference } from '@/hooks/use-preferences'
import { ComboSelect } from '@/components/combo-select'

/** Where links open: the map a location goes to, the tracker a flight goes to. */
export function UserLinks() {
  const { t } = useLingui()
  usePageTitle(t`Links`)
  const { data, isLoading, error, refetch } = usePreferencesData()
  const setPreference = useSetPreference()
  const { raw: currentLocale } = useLocale()

  const handleChange = (key: 'maps' | 'flights', value: string) => {
    setPreference.mutate(
      { [key]: value },
      {
        onSuccess: () => {
          // The shell carries the link preferences with the locale block, so
          // every open app learns the change without a reload.
          shellSetLocale({
            ...currentLocale,
            [key]: value,
          } as LocalePreferences)
          toast.success(t`Preference updated`)
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, t`Failed to update preference`))
        },
      }
    )
  }

  return (
    <>
      <PageHeader
        title={t`Links`}
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
                  options={MAP_SERVICE_NAMES}
                  onChange={(value) => handleChange('maps', value)}
                  disabled={setPreference.isPending}
                />
              </div>
            </FieldRow>
            <FieldRow label={t`Flights`}>
              <div className='w-full'>
                <ComboSelect
                  value={flightService(data.preferences.flights)}
                  options={FLIGHT_SERVICE_NAMES}
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
