// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import {
  useSystemSettingsData as useSystemSettingsDataCommon,
  useSetSystemSetting as useSetSystemSettingCommon,
} from '@mochi/web'
import endpoints from '@/api/endpoints'

export function useSystemSettingsData() {
  return useSystemSettingsDataCommon(endpoints.system.settings)
}

export function useSetSystemSetting() {
  return useSetSystemSettingCommon(endpoints.system.settingsSet)
}
