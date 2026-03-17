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
