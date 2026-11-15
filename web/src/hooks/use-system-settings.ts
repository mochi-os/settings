// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import {
  systemSettingsQuery,
  useSystemSettingsData as useSystemSettingsDataCommon,
  useSetSystemSetting as useSetSystemSettingCommon,
} from '@mochi/web'
import endpoints from '@/api/endpoints'

// The server's settings, which the settings and status pages show. The
// loaders that start them use the options the hook below reads them with.
export function serverSettingsQuery() {
  return systemSettingsQuery(endpoints.system.settings)
}

export function useSystemSettingsData() {
  return useSystemSettingsDataCommon(endpoints.system.settings)
}

export function useSetSystemSetting() {
  return useSetSystemSettingCommon(endpoints.system.settingsSet)
}
