import { useState } from 'react'
import type { SystemSetting } from '@/types/settings'
import { Loader2, Lock, RotateCcw, Settings } from 'lucide-react'
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
  Input,
  Skeleton,
  Switch,
  PageHeader,
  Main,
  usePageTitle,
  getErrorMessage,
  toast,
  Section,
  FieldRow,
  DataChip,
} from '@mochi/common'
import { usePreferencesData } from '@/hooks/use-preferences'
import {
  useSystemSettingsData,
  useSetSystemSetting,
} from '@/hooks/use-system-settings'

const settingLabels: Record<string, string> = {
  apps_install_user: 'Allow users to install apps',
  auth_methods_allowed: 'Allowed login methods',
  auth_methods_required: 'Required login methods',
  auth_passkey_enabled: 'Passkey login',
  auth_email_enabled: 'Email code login',
  auth_recovery_enabled: 'Recovery code login',
  domains_verification: 'Require domain verification',
  email_from: 'Email default from address',
  server_started: 'Server started',
  server_version: 'Server version',
  signup_enabled: 'Allow new signups',
}

function formatSettingName(name: string): string {
  if (settingLabels[name]) {
    return settingLabels[name]
  }
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatSettingValue(
  name: string,
  value: string,
  timezone?: string
): string {
  if (name === 'server_started' && value) {
    const timestamp = parseInt(value, 10)
    if (!isNaN(timestamp)) {
      const date = new Date(timestamp * 1000)
      const tz = timezone === 'auto' || !timezone ? undefined : timezone
      return date.toLocaleString('sv-SE', { timeZone: tz }).replace('T', ' ')
    }
  }
  return value || '(empty)'
}

function isBooleanSetting(setting: SystemSetting): boolean {
  return setting.pattern === '^(true|false)$'
}

function SettingField({
  setting,
  onSave,
  isSaving,
  timezone,
}: {
  setting: SystemSetting
  onSave: (name: string, value: string) => void
  isSaving: boolean
  timezone?: string
}) {
  const [localValue, setLocalValue] = useState(setting.value)
  const isBoolean = isBooleanSetting(setting)
  const hasChanged = localValue !== setting.value
  const isDefault = setting.value === setting.default

  const handleSave = () => {
    onSave(setting.name, localValue)
  }

  const handleReset = () => {
    onSave(setting.name, setting.default)
    setLocalValue(setting.default)
  }

  const handleToggle = (checked: boolean) => {
    const newValue = checked ? 'true' : 'false'
    setLocalValue(newValue)
    onSave(setting.name, newValue)
  }

  return (
    <FieldRow 
      label={formatSettingName(setting.name)}
      description={setting.description}
    >
      <div className='flex items-center gap-2'>
        {setting.read_only ? (
          <DataChip 
            value={formatSettingValue(setting.name, setting.value, timezone)} 
            icon={setting.read_only ? <Lock className="size-3" /> : undefined}
          />
        ) : isBoolean ? (
          <div className="flex items-center gap-3">
            <Switch
              checked={localValue === 'true'}
              onCheckedChange={handleToggle}
              disabled={isSaving}
            />
            {!isDefault && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8 text-muted-foreground'
                    disabled={isSaving}
                  >
                    <RotateCcw className='h-4 w-4' />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset to default?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reset "{formatSettingName(setting.name)}" to its
                      default value ({setting.default}).
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset}>
                      Reset
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full max-w-sm">
            <Input
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              className='h-9 font-mono text-sm'
              disabled={isSaving}
            />
            {hasChanged ? (
              <Button size='sm' onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  'Save'
                )}
              </Button>
            ) : !isDefault && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-9 w-9 text-muted-foreground'
                    disabled={isSaving}
                  >
                    <RotateCcw className='h-4 w-4' />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset to default?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reset "{formatSettingName(setting.name)}" to its
                      default value ({setting.default || '(empty)'}).
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset}>
                      Reset
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </div>
    </FieldRow>
  )
}

export function SystemSettings() {
  usePageTitle('System settings')
  const { data, isLoading, error } = useSystemSettingsData()
  const { data: prefsData } = usePreferencesData()
  const setSetting = useSetSystemSetting()
  const [savingName, setSavingName] = useState<string | null>(null)
  const timezone = prefsData?.preferences.timezone

  const handleSave = (name: string, value: string) => {
    setSavingName(name)
    setSetting.mutate(
      { name, value },
      {
        onSuccess: () => {
          toast.success('Setting updated')
          setSavingName(null)
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, 'Failed to update setting'))
          setSavingName(null)
        },
      }
    )
  }

  if (error) {
    return (
      <>
        <PageHeader title="System settings" icon={<Settings className='size-4 md:size-5' />} />
        <Main>
          <p className='text-muted-foreground'>Failed to load settings</p>
        </Main>
      </>
    )
  }

  const statusSettings = ['server_version', 'server_started']
  const sortedSettings = data?.settings
    ? [...data.settings]
        .filter((s) => !statusSettings.includes(s.name))
        .sort((a, b) =>
          formatSettingName(a.name).localeCompare(formatSettingName(b.name))
        )
    : []

  const infoSettings = data?.settings
    ? data.settings.filter(s => statusSettings.includes(s.name))
    : []

  return (
    <>
      <PageHeader title="System settings" icon={<Settings className='size-4 md:size-5' />} />

      <Main className="space-y-8">
        <Section 
          title="Configuration" 
          description="Global server settings"
        >
          <div className='divide-y-0'>
            {isLoading ? (
              <div className='space-y-6 py-4'>
                <Skeleton className='h-12 w-full' />
                <Skeleton className='h-12 w-full' />
                <Skeleton className='h-12 w-full' />
                <Skeleton className='h-12 w-full' />
              </div>
            ) : (
              sortedSettings.map((setting) => (
                <SettingField
                  key={setting.name}
                  setting={setting}
                  onSave={handleSave}
                  isSaving={savingName === setting.name}
                  timezone={timezone}
                />
              ))
            )}
          </div>
        </Section>

        {infoSettings.length > 0 && (
          <Section 
            title="System Info" 
            description="Server status information"
          >
            <div className="divide-y-0">
               {infoSettings.map(setting => (
                 <FieldRow key={setting.name} label={formatSettingName(setting.name)}>
                    <DataChip value={formatSettingValue(setting.name, setting.value, timezone)} />
                 </FieldRow>
               ))}
            </div>
          </Section>
        )}
      </Main>
    </>
  )
}
