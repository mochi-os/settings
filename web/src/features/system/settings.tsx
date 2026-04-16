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
  GeneralError,
  ListSkeleton,
  Switch,
  PageHeader,
  Main,
  usePageTitle,
  getErrorMessage,
  toast,
  Section,
  FieldRow,
  DataChip,
  formatSystemTimestamp,
} from '@mochi/web'
import {
  useSystemSettingsData,
  useSetSystemSetting,
} from '@/hooks/use-system-settings'

const settingLabels: Record<string, string> = {
  apps_install_user: 'Allow users to install apps',
  auth_email: 'Login using email code',
  auth_passkey: 'Login using passkey',
  auth_totp: 'Login using TOTP authenticator app',
  auth_recovery: 'Login using recovery code',
  auth_oauth: 'Login using OAuth 2.0',
  default_theme: 'Default theme',
  domains_verification: 'Require domain verification',
  email_from: 'Default from address for system emails',
  oauth_public_url: 'Public URL for OAuth redirects',
  oauth_google_client_id: 'Google client ID',
  oauth_google_client_secret: 'Google client secret',
  oauth_github_client_id: 'GitHub client ID',
  oauth_github_client_secret: 'GitHub client secret',
  oauth_microsoft_client_id: 'Microsoft client ID',
  oauth_microsoft_client_secret: 'Microsoft client secret',
  oauth_microsoft_tenant: 'Microsoft tenant',
  oauth_facebook_client_id: 'Facebook App ID',
  oauth_facebook_client_secret: 'Facebook App secret',
  oauth_x_client_id: 'X client ID',
  oauth_x_client_secret: 'X client secret',
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
): string {
  if (name === 'server_started' && value) {
    const timestamp = parseInt(value, 10)
    if (!isNaN(timestamp)) {
      return formatSystemTimestamp(timestamp)
    }
  }
  return value || '(empty)'
}

function isBooleanSetting(setting: SystemSetting): boolean {
  return setting.pattern === '^(true|false)$'
}

// Parse an enum pattern like "^(required|allowed|disabled)$" into its option list.
function enumOptions(setting: SystemSetting): string[] | null {
  const m = setting.pattern.match(/^\^\(([^)]+)\)\$$/)
  if (!m) return null
  const opts = m[1].split('|').map((s) => s.trim())
  // Only treat as enum if we have more than 2 options, or if it's the
  // allowed|disabled shape — i.e. explicitly not the true|false Switch shape.
  if (opts.length < 2) return null
  if (opts.length === 2 && opts.includes('true') && opts.includes('false')) return null
  return opts
}

// Full slot list for auth-method state settings so allowed/disabled line up
// across rows regardless of whether a setting supports "required". Returns
// null for any enum pattern that isn't part of the required/allowed/disabled
// family.
const methodStateSlots = ['disabled', 'allowed', 'required'] as const
function methodStateOptions(opts: string[] | null): Set<string> | null {
  if (!opts) return null
  if (!opts.every((o) => (methodStateSlots as readonly string[]).includes(o))) {
    return null
  }
  return new Set(opts)
}

function SettingField({
  setting,
  onSave,
  isSaving,
}: {
  setting: SystemSetting
  onSave: (name: string, value: string) => void
  isSaving: boolean
}) {
  const [localValue, setLocalValue] = useState(setting.value)
  const isBoolean = isBooleanSetting(setting)
  const enumOpts = enumOptions(setting)
  const methodStates = methodStateOptions(enumOpts)
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

  const handlePick = (value: string) => {
    setLocalValue(value)
    onSave(setting.name, value)
  }

  return (
    <FieldRow
      label={formatSettingName(setting.name)}
      className='sm:grid-cols-[400px_minmax(0,1fr)]'
    >
      <div className='flex items-center gap-2 w-full'>
        {setting.read_only ? (
          <DataChip 
            value={formatSettingValue(setting.name, setting.value)} 
            icon={setting.read_only ? <Lock className="size-3" /> : undefined}
          />
        ) : methodStates ? (
          <div className='flex items-center gap-2'>
            <div className='inline-flex rounded-md border bg-background p-0.5'>
              {methodStateSlots
                .filter((slot) => methodStates.has(slot))
                .map((slot) => (
                  <button
                    key={slot}
                    type='button'
                    onClick={() => handlePick(slot)}
                    disabled={isSaving || localValue === slot}
                    className={
                      'w-20 py-1 text-xs font-medium rounded-sm capitalize transition-colors ' +
                      (localValue === slot
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground')
                    }
                  >
                    {slot}
                  </button>
                ))}
            </div>
            {!isDefault && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8 text-muted-foreground'
                    disabled={isSaving}
                    aria-label='Reset to default'
                    title='Reset to default'
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
                    aria-label='Reset to default'
                    title='Reset to default'
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
          <div className="flex items-center gap-2 w-full">
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
                    aria-label='Reset to default'
                    title='Reset to default'
                  >
                    <RotateCcw className='h-4 w-4' />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset to default?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reset "{formatSettingName(setting.name)}" to its
                      default {setting.default ? `value (${setting.default})` : '(empty)'}.
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
  const { data, isLoading, error, refetch } = useSystemSettingsData()
  const setSetting = useSetSystemSetting()
  const [savingName, setSavingName] = useState<string | null>(null)

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

  const hiddenSettings = ['server_version', 'server_started']
  const userDefaultSettings = ['default_theme']
  const isOauthCredential = (name: string) => name.startsWith('oauth_')
  const isLoginSetting = (name: string) =>
    name.startsWith('auth_') || name === 'signup_enabled'

  const allSettings = data?.settings
    ? [...data.settings]
        .filter((s) => !hiddenSettings.includes(s.name))
        .sort((a, b) =>
          formatSettingName(a.name).localeCompare(formatSettingName(b.name))
        )
    : []

  const loginSettings = allSettings.filter((s) => isLoginSetting(s.name))
  const oauthSettings = allSettings.filter((s) => isOauthCredential(s.name))
  const userDefaults = allSettings.filter((s) =>
    userDefaultSettings.includes(s.name)
  )
  const other = allSettings.filter(
    (s) =>
      !isLoginSetting(s.name) &&
      !isOauthCredential(s.name) &&
      !userDefaultSettings.includes(s.name)
  )

  const renderSettings = (settings: typeof allSettings) =>
    settings.map((setting) => (
      <SettingField
        key={setting.name}
        setting={setting}
        onSave={handleSave}
        isSaving={savingName === setting.name}
      />
    ))

  return (
    <>
      <PageHeader title="System settings" icon={<Settings className='size-4 md:size-5' />} />

      <Main className="space-y-8">
        {error ? (
          <GeneralError error={error} minimal mode='inline' reset={refetch} />
        ) : isLoading ? (
          <ListSkeleton variant='simple' height='h-12' count={4} />
        ) : (
          <>
            <Section title="Login">
              <div className='divide-y-0'>
                {renderSettings(loginSettings)}
              </div>
            </Section>

            {oauthSettings.length > 0 && (
              <Section title="Third-party login">
                <div className='divide-y-0'>
                  {renderSettings(oauthSettings)}
                </div>
              </Section>
            )}

            <Section title="User defaults">
              <div className='divide-y-0'>
                {renderSettings(userDefaults)}
              </div>
            </Section>

            <Section title="Other settings">
              <div className='divide-y-0'>
                {renderSettings(other)}
              </div>
            </Section>
          </>
        )}
      </Main>
    </>
  )
}
