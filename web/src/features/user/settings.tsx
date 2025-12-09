import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import type { Passkey, TotpSetupResponse, Session } from '@/types/account'
import { startRegistration } from '@simplewebauthn/browser'
import {
  Check,
  Copy,
  Globe,
  Key,
  Loader2,
  LogOut,
  Monitor,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  ChevronsUpDown,
  RotateCcw,
  Settings,
  Shield,
  Smartphone,
  Trash2,
  User,
  Users,
  Activity,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/theme-provider'
import {
  useAccountData,
  useMethods,
  usePasskeyDelete,
  usePasskeyRegisterBegin,
  usePasskeyRegisterFinish,
  usePasskeyRename,
  usePasskeys,
  useRecoveryGenerate,
  useRecoveryStatus,
  useRevokeSession,
  useSetMethods,
  useTotpDisable,
  useTotpSetup,
  useTotpStatus,
  useTotpVerify,
} from '@/hooks/use-account'
import {
  usePreferencesData,
  useSetPreference,
  useResetPreferences,
} from '@/hooks/use-preferences'
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
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { DomainsContent } from '@/features/domains'
import { SystemSettingsContent } from '@/features/system/settings'
import { SystemStatusContent } from '@/features/system/status'
import { SystemUsersContent } from '@/features/system/users'

function formatTimestamp(timestamp: number): string {
  if (timestamp === 0) return 'Never'
  return format(new Date(timestamp * 1000), 'yyyy-MM-dd HH:mm')
}

// ============================================================================
// Account Tab - Identity Section
// ============================================================================

function IdentitySection() {
  const { data, isLoading } = useAccountData()

  return (
    <section>
      <div className='mb-4 flex items-center gap-2'>
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
            <dd className='font-mono text-xs break-all'>
              {data.identity.entity}
            </dd>
          </div>
        </dl>
      ) : null}
    </section>
  )
}

// ============================================================================
// Account Tab - Login Requirements Section
// ============================================================================

function LoginRequirementsSection() {
  const { data: methodsData, isLoading } = useMethods()
  const { data: passkeysData } = usePasskeys()
  const { data: totpData } = useTotpStatus()
  const setMethods = useSetMethods()

  const methods = methodsData?.methods ?? ['email']
  const hasPasskey = (passkeysData?.passkeys?.length ?? 0) > 0
  const hasTOTP = totpData?.enabled ?? false

  const handleToggleMethod = (method: string, enabled: boolean) => {
    let newMethods: string[]
    if (enabled) {
      newMethods = [...methods, method]
    } else {
      newMethods = methods.filter((m) => m !== method)
    }
    // Ensure at least one method
    if (newMethods.length === 0) {
      newMethods = ['email']
    }

    setMethods.mutate(newMethods, {
      onSuccess: () => {
        toast.success('Login requirements updated')
      },
      onError: (error) => {
        toast.error('Failed to update login requirements', {
          description: error instanceof Error ? error.message : undefined,
        })
      },
    })
  }

  return (
    <section>
      <div className='mb-4 flex items-center gap-2'>
        <Shield className='h-5 w-5' />
        <h2 className='text-lg font-semibold'>Login requirements</h2>
      </div>
      <p className='text-muted-foreground mb-4 text-sm'>
        Require all selected methods to log in:
      </p>
      {isLoading ? (
        <div className='space-y-3'>
          <Skeleton className='h-8 w-full' />
          <Skeleton className='h-8 w-full' />
          <Skeleton className='h-8 w-full' />
        </div>
      ) : (
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <Label htmlFor='method-passkey'>Passkey</Label>
              <p className='text-muted-foreground text-xs'>
                {hasPasskey
                  ? 'Use a registered passkey'
                  : 'Register a passkey below to enable'}
              </p>
            </div>
            <Switch
              id='method-passkey'
              checked={methods.includes('passkey')}
              onCheckedChange={(checked) =>
                handleToggleMethod('passkey', checked)
              }
              disabled={setMethods.isPending || !hasPasskey}
            />
          </div>

          <div className='flex items-center justify-between'>
            <div>
              <Label htmlFor='method-totp'>Authenticator app</Label>
              <p className='text-muted-foreground text-xs'>
                {hasTOTP
                  ? 'Use an authenticator app code'
                  : 'Set up an authenticator below to enable'}
              </p>
            </div>
            <Switch
              id='method-totp'
              checked={methods.includes('totp')}
              onCheckedChange={(checked) => handleToggleMethod('totp', checked)}
              disabled={setMethods.isPending || !hasTOTP}
            />
          </div>

          <div className='flex items-center justify-between'>
            <div>
              <Label htmlFor='method-email'>Email code</Label>
              <p className='text-muted-foreground text-xs'>
                Receive a code by email
              </p>
            </div>
            <Switch
              id='method-email'
              checked={methods.includes('email')}
              onCheckedChange={(checked) =>
                handleToggleMethod('email', checked)
              }
              disabled={
                setMethods.isPending ||
                (methods.length === 1 && methods.includes('email'))
              }
            />
          </div>
        </div>
      )}
    </section>
  )
}

// ============================================================================
// Account Tab - Passkeys Section
// ============================================================================

function PasskeyRow({
  passkey,
  onRename,
  onDelete,
}: {
  passkey: Passkey
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [newName, setNewName] = useState(passkey.name)

  const handleRename = () => {
    if (newName.trim() && newName !== passkey.name) {
      onRename(passkey.id, newName.trim())
    }
    setIsRenaming(false)
  }

  return (
    <TableRow>
      <TableCell>
        {isRenaming ? (
          <div className='flex items-center gap-2'>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className='h-8 w-40'
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') setIsRenaming(false)
              }}
            />
            <Button size='sm' variant='ghost' onClick={handleRename}>
              <Check className='h-4 w-4' />
            </Button>
          </div>
        ) : (
          <span className='font-medium'>{passkey.name}</span>
        )}
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {formatTimestamp(passkey.created)}
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {formatTimestamp(passkey.last_used)}
      </TableCell>
      <TableCell className='text-right'>
        <div className='flex justify-end gap-1'>
          <Button variant='ghost' size='sm' onClick={() => setIsRenaming(true)}>
            <Pencil className='h-4 w-4' />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant='ghost' size='sm'>
                <Trash2 className='h-4 w-4' />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete passkey?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove "{passkey.name}" from your account. You won't
                  be able to use it to sign in anymore.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(passkey.id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  )
}

function PasskeysSection() {
  const { data, isLoading } = usePasskeys()
  const registerBegin = usePasskeyRegisterBegin()
  const registerFinish = usePasskeyRegisterFinish()
  const renamePasskey = usePasskeyRename()
  const deletePasskey = usePasskeyDelete()
  const [isRegistering, setIsRegistering] = useState(false)
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false)
  const [passkeyName, setPasskeyName] = useState('')

  const handleRegister = async () => {
    setIsRegistering(true)
    try {
      // Begin registration
      const beginResult = await registerBegin.mutateAsync()

      // Perform WebAuthn ceremony
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const credential = await startRegistration({
        optionsJSON: beginResult.options as any,
      })

      // Complete registration
      await registerFinish.mutateAsync({
        ceremony: beginResult.ceremony,
        credential,
        name: passkeyName || 'Passkey',
      })

      toast.success('Passkey registered')
      setRegisterDialogOpen(false)
      setPasskeyName('')
    } catch (error) {
      if (error instanceof Error && error.name === 'NotAllowedError') {
        toast.error('Registration cancelled')
      } else {
        toast.error('Failed to register passkey', {
          description: error instanceof Error ? error.message : undefined,
        })
      }
    } finally {
      setIsRegistering(false)
    }
  }

  const handleRename = (id: string, name: string) => {
    renamePasskey.mutate(
      { id, name },
      {
        onSuccess: () => toast.success('Passkey renamed'),
        onError: () => toast.error('Failed to rename passkey'),
      }
    )
  }

  const handleDelete = (id: string) => {
    deletePasskey.mutate(id, {
      onSuccess: () => toast.success('Passkey deleted'),
      onError: (error) =>
        toast.error('Failed to delete passkey', {
          description: error instanceof Error ? error.message : undefined,
        }),
    })
  }

  const passkeys = data?.passkeys ?? []

  return (
    <section>
      <div className='mb-4 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Key className='h-5 w-5' />
          <h2 className='text-lg font-semibold'>Passkeys</h2>
        </div>
        <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setRegisterDialogOpen(true)}
          >
            Add passkey
            <Plus className='ml-2 h-4 w-4' />
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register passkey</DialogTitle>
              <DialogDescription>
                Use a security key, fingerprint, or face recognition to sign in
                without a password.
              </DialogDescription>
            </DialogHeader>
            <div className='py-4'>
              <Label htmlFor='passkey-name'>Passkey name</Label>
              <Input
                id='passkey-name'
                placeholder='My passkey'
                value={passkeyName}
                onChange={(e) => setPasskeyName(e.target.value)}
                className='mt-2'
              />
            </div>
            <DialogFooter>
              <Button onClick={handleRegister} disabled={isRegistering}>
                Register
                {isRegistering && (
                  <Loader2 className='ml-2 h-4 w-4 animate-spin' />
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className='space-y-3'>
          <Skeleton className='h-10 w-full' />
          <Skeleton className='h-10 w-full' />
        </div>
      ) : passkeys.length === 0 ? (
        <p className='text-muted-foreground text-sm'>
          No passkeys registered. Add a passkey to sign in without a password.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead className='w-24'></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {passkeys.map((passkey) => (
              <PasskeyRow
                key={passkey.id}
                passkey={passkey}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}

// ============================================================================
// Account Tab - Authenticator App Section
// ============================================================================

function AuthenticatorSection() {
  const { data, isLoading } = useTotpStatus()
  const setupTotp = useTotpSetup()
  const verifyTotp = useTotpVerify()
  const disableTotp = useTotpDisable()
  const [setupData, setSetupData] = useState<TotpSetupResponse | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  const handleSetup = async () => {
    try {
      const result = await setupTotp.mutateAsync()
      setSetupData(result)
    } catch {
      toast.error('Failed to set up authenticator')
    }
  }

  const handleVerify = async () => {
    if (!verifyCode) return
    setIsVerifying(true)
    try {
      const result = await verifyTotp.mutateAsync(verifyCode)
      if (result.ok) {
        toast.success('Authenticator app enabled')
        setSetupData(null)
        setVerifyCode('')
      } else {
        toast.error('Invalid code', {
          description: 'Please check the code and try again.',
        })
      }
    } catch {
      toast.error('Failed to verify code')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleDisable = () => {
    disableTotp.mutate(undefined, {
      onSuccess: () => toast.success('Authenticator app disabled'),
      onError: (error) =>
        toast.error('Failed to disable authenticator', {
          description: error instanceof Error ? error.message : undefined,
        }),
    })
  }

  const handleCopySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret)
      toast.success('Secret copied to clipboard')
    }
  }

  const isEnabled = data?.enabled ?? false

  return (
    <section>
      <div className='mb-4 flex items-center gap-2'>
        <Smartphone className='h-5 w-5' />
        <h2 className='text-lg font-semibold'>Authenticator app</h2>
      </div>

      {isLoading ? (
        <Skeleton className='h-8 w-48' />
      ) : setupData ? (
        <div className='space-y-4'>
          <p className='text-sm'>
            Scan this QR code with your TOTP authenticator app:
          </p>
          <div className='flex justify-center rounded-lg border bg-white p-4'>
            <QRCodeSVG value={setupData.url} size={200} />
          </div>
          <div className='space-y-2'>
            <Label>Or enter this secret manually:</Label>
            <div className='flex items-center gap-2'>
              <code className='bg-muted flex-1 rounded px-3 py-2 font-mono text-sm'>
                {setupData.secret}
              </code>
              <Button variant='outline' size='sm' onClick={handleCopySecret}>
                <Copy className='h-4 w-4' />
              </Button>
            </div>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='totp-verify'>Enter verification code:</Label>
            <div className='flex items-center gap-2'>
              <Input
                id='totp-verify'
                placeholder='000000'
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                className='w-32 font-mono'
                maxLength={6}
              />
              <Button
                onClick={handleVerify}
                disabled={isVerifying || !verifyCode}
              >
                Verify
                {isVerifying && (
                  <Loader2 className='ml-2 h-4 w-4 animate-spin' />
                )}
              </Button>
              <Button
                variant='ghost'
                onClick={() => {
                  setSetupData(null)
                  setVerifyCode('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : isEnabled ? (
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-sm font-medium text-green-600'>Enabled</p>
            <p className='text-muted-foreground text-xs'>
              Your authenticator app is configured.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant='outline' size='sm'>
                Disable
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disable authenticator?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove the authenticator app from your account. If
                  it's a required login method, you'll need to update your login
                  requirements first.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDisable}>
                  Disable
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : (
        <div className='flex items-center justify-between'>
          <p className='text-muted-foreground text-sm'>
            Add an authenticator app for additional security.
          </p>
          <Button
            variant='outline'
            size='sm'
            onClick={handleSetup}
            disabled={setupTotp.isPending}
          >
            Set up
            {setupTotp.isPending && (
              <Loader2 className='ml-2 h-4 w-4 animate-spin' />
            )}
          </Button>
        </div>
      )}
    </section>
  )
}

// ============================================================================
// Account Tab - Recovery Codes Section
// ============================================================================

function RecoveryCodesSection() {
  const { data, isLoading } = useRecoveryStatus()
  const generateCodes = useRecoveryGenerate()
  const [showCodes, setShowCodes] = useState<string[] | null>(null)

  const handleGenerate = async () => {
    try {
      const result = await generateCodes.mutateAsync()
      setShowCodes(result.codes)
    } catch {
      toast.error('Failed to generate recovery codes')
    }
  }

  const handleCopyCodes = () => {
    if (showCodes) {
      navigator.clipboard.writeText(showCodes.join('\n'))
      toast.success('Recovery codes copied to clipboard')
    }
  }

  const count = data?.count ?? 0

  return (
    <section>
      <div className='mb-4 flex items-center gap-2'>
        <RefreshCw className='h-5 w-5' />
        <h2 className='text-lg font-semibold'>Recovery codes</h2>
      </div>

      {isLoading ? (
        <Skeleton className='h-8 w-48' />
      ) : showCodes ? (
        <div className='space-y-4'>
          <p className='text-sm'>
            Save these recovery codes in a secure place. Each code can only be
            used once.
          </p>
          <div className='bg-muted rounded-lg p-4'>
            <div className='grid grid-cols-2 gap-2 font-mono text-sm'>
              {showCodes.map((code, i) => (
                <div key={i} className='bg-background rounded px-2 py-1'>
                  {code}
                </div>
              ))}
            </div>
          </div>
          <div className='flex gap-2'>
            <Button variant='outline' size='sm' onClick={handleCopyCodes}>
              Copy all
              <Copy className='ml-2 h-4 w-4' />
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setShowCodes(null)}
            >
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div className='flex items-center justify-between'>
          <div>
            {count > 0 ? (
              <>
                <p className='text-sm font-medium'>
                  {count} code{count !== 1 ? 's' : ''} remaining
                </p>
                <p className='text-muted-foreground text-xs'>
                  Use a recovery code if you lose access to other methods.
                </p>
              </>
            ) : (
              <p className='text-muted-foreground text-sm'>
                Generate recovery codes as a backup login method.
              </p>
            )}
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant='outline'
                size='sm'
                disabled={generateCodes.isPending}
              >
                {count > 0 ? 'Regenerate' : 'Generate'}
                {generateCodes.isPending && (
                  <Loader2 className='ml-2 h-4 w-4 animate-spin' />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {count > 0
                    ? 'Regenerate recovery codes?'
                    : 'Generate recovery codes?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {count > 0
                    ? 'This will invalidate your existing recovery codes and generate new ones. Make sure to save the new codes.'
                    : 'You will receive 10 recovery codes. Save them in a secure place.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleGenerate}>
                  {count > 0 ? 'Regenerate' : 'Generate'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </section>
  )
}

// ============================================================================
// Account Tab Content
// ============================================================================

function AccountTabContent() {
  const { error } = useAccountData()

  if (error) {
    return (
      <p className='text-muted-foreground'>
        Failed to load account information
      </p>
    )
  }

  return (
    <div className='space-y-8'>
      <IdentitySection />
      <Separator />
      <LoginRequirementsSection />
      <Separator />
      <PasskeysSection />
      <Separator />
      <AuthenticatorSection />
      <Separator />
      <RecoveryCodesSection />
    </div>
  )
}

// ============================================================================
// Sessions Tab Content
// ============================================================================

function SessionRow({
  session,
  isCurrent,
}: {
  session: Session
  isCurrent: boolean
}) {
  const revokeSession = useRevokeSession()

  const handleRevoke = () => {
    revokeSession.mutate(session.code, {
      onSuccess: () => {
        toast.success('Session revoked')
      },
      onError: () => {
        toast.error('Failed to revoke session')
      },
    })
  }

  return (
    <TableRow>
      <TableCell>
        <div className='flex flex-col'>
          <span className='font-medium'>
            {session.agent || 'Unknown device'}
            {isCurrent && (
              <span className='text-muted-foreground ml-2 text-xs'>
                (current)
              </span>
            )}
          </span>
        </div>
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {formatTimestamp(session.created)}
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {formatTimestamp(session.accessed)}
      </TableCell>
      <TableCell className='text-right'>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              disabled={revokeSession.isPending}
            >
              {revokeSession.isPending ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <LogOut className='h-4 w-4' />
              )}
              <span className='sr-only'>Revoke session</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke session?</AlertDialogTitle>
              <AlertDialogDescription>
                This will sign out this session. If this is your current
                session, you will need to sign in again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRevoke}>
                Revoke
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}

function SessionsTabContent() {
  const { data, isLoading, error } = useAccountData()

  if (error) {
    return <p className='text-muted-foreground'>Failed to load sessions</p>
  }

  const sessions = data?.sessions ?? []
  const sortedSessions = [...sessions].sort((a, b) => b.accessed - a.accessed)

  return (
    <>
      {isLoading ? (
        <div className='space-y-3'>
          <Skeleton className='h-10 w-full' />
          <Skeleton className='h-10 w-full' />
          <Skeleton className='h-10 w-full' />
        </div>
      ) : sessions.length === 0 ? (
        <p className='text-muted-foreground text-sm'>No active sessions</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className='w-12'></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSessions.map((session, index) => (
              <SessionRow
                key={session.code}
                session={session}
                isCurrent={index === 0 && session.accessed > 0}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </>
  )
}

// ============================================================================
// Preferences Tab Content
// ============================================================================

const themeLabels: Record<string, string> = {
  light: 'Light',
  dark: 'Dark',
  auto: 'System',
}

function getTimezones(): string[] {
  try {
    return (
      (
        Intl as { supportedValuesOf?: (key: string) => string[] }
      ).supportedValuesOf?.('timeZone') ?? []
    )
  } catch {
    return []
  }
}

function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

function TimezoneSelect({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const timezones = useMemo(() => getTimezones(), [])
  const browserTimezone = useMemo(() => getBrowserTimezone(), [])

  const formatTimezone = (tz: string) => tz.replace(/_/g, ' ')
  const displayValue =
    value === 'auto'
      ? `Auto (${formatTimezone(browserTimezone)})`
      : formatTimezone(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className='w-full justify-between'
          disabled={disabled}
        >
          <span className='truncate'>{displayValue}</span>
          <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[350px] p-0'>
        <Command>
          <CommandInput placeholder='Search timezone...' />
          <CommandList>
            <CommandEmpty>No timezone found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value='auto'
                onSelect={() => {
                  onChange('auto')
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4 shrink-0',
                    value === 'auto' ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <span className='truncate'>
                  Auto ({formatTimezone(browserTimezone)})
                </span>
              </CommandItem>
              {timezones.map((tz) => (
                <CommandItem
                  key={tz}
                  value={tz}
                  onSelect={() => {
                    onChange(tz)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0',
                      value === tz ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className='truncate'>{formatTimezone(tz)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function PreferenceRow({
  label,
  description,
  children,
}: {
  label: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className='flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between'>
      <div className='space-y-0.5'>
        <Label className='text-base'>{label}</Label>
        <p className='text-muted-foreground text-sm'>{description}</p>
      </div>
      <div className='w-full sm:w-48'>{children}</div>
    </div>
  )
}

function PreferencesTabContent() {
  const { data, isLoading, error } = usePreferencesData()
  const setPreference = useSetPreference()
  const resetPreferences = useResetPreferences()
  const { setTheme } = useTheme()

  const handleChange = (key: string, value: string) => {
    if (key === 'theme') {
      const themeValue =
        value === 'auto' ? 'system' : (value as 'light' | 'dark')
      setTheme(themeValue)
    }
    setPreference.mutate(
      { [key]: value },
      {
        onSuccess: () => {
          toast.success('Preference updated')
        },
        onError: () => {
          toast.error('Failed to update preference')
        },
      }
    )
  }

  const handleReset = () => {
    resetPreferences.mutate(undefined, {
      onSuccess: () => {
        toast.success('Preferences reset to defaults')
      },
      onError: () => {
        toast.error('Failed to reset preferences')
      },
    })
  }

  if (error) {
    return <p className='text-muted-foreground'>Failed to load preferences</p>
  }

  return (
    <>
      {isLoading ? (
        <div className='space-y-6'>
          <Skeleton className='h-16 w-full' />
          <Skeleton className='h-16 w-full' />
          <Skeleton className='h-16 w-full' />
        </div>
      ) : data ? (
        <>
          <div className='divide-y'>
            <PreferenceRow label='Theme' description='Appearance'>
              <Select
                value={data.preferences.theme}
                onValueChange={(value) => handleChange('theme', value)}
                disabled={setPreference.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(themeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PreferenceRow>

            <PreferenceRow
              label='Timezone'
              description='Timezone for displaying dates and times'
            >
              <TimezoneSelect
                value={data.preferences.timezone}
                onChange={(value) => handleChange('timezone', value)}
                disabled={setPreference.isPending}
              />
            </PreferenceRow>
          </div>

          <div className='mt-6 flex justify-end'>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant='outline'
                  disabled={isLoading || resetPreferences.isPending}
                >
                  {resetPreferences.isPending ? (
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  ) : (
                    <RotateCcw className='mr-2 h-4 w-4' />
                  )}
                  Reset to Defaults
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset preferences?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will reset all preferences to their default values.
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
          </div>
        </>
      ) : null}
    </>
  )
}

// ============================================================================
// Main Component
// ============================================================================

type UserSettingsProps = {
  defaultTab?: string
}

export function UserSettings({ defaultTab = 'account' }: UserSettingsProps) {
  return (
    <>
      <Header>
        <div className='flex flex-col'>
          <h1 className='text-lg font-semibold'>Settings</h1>
          <p className='text-muted-foreground text-sm'>
            Manage your account settings and preferences.
          </p>
        </div>
      </Header>

      <Main>
        <Tabs defaultValue={defaultTab} className='space-y-6'>
          <TabsList className='grid w-full max-w-4xl grid-cols-7'>
            <TabsTrigger value='account' className='gap-2'>
              <User className='h-4 w-4' />
              <span className='hidden sm:inline'>Account</span>
            </TabsTrigger>
            <TabsTrigger value='sessions' className='gap-2'>
              <Monitor className='h-4 w-4' />
              <span className='hidden sm:inline'>Sessions</span>
            </TabsTrigger>
            <TabsTrigger value='preferences' className='gap-2'>
              <Palette className='h-4 w-4' />
              <span className='hidden sm:inline'>Preferences</span>
            </TabsTrigger>
            <TabsTrigger value='domains' className='gap-2'>
              <Globe className='h-4 w-4' />
              <span className='hidden sm:inline'>Domains</span>
            </TabsTrigger>
            <TabsTrigger value='settings' className='gap-2'>
              <Settings className='h-4 w-4' />
              <span className='hidden sm:inline'>Settings</span>
            </TabsTrigger>
            <TabsTrigger value='users' className='gap-2'>
              <Users className='h-4 w-4' />
              <span className='hidden sm:inline'>Users</span>
            </TabsTrigger>
            <TabsTrigger value='status' className='gap-2'>
              <Activity className='h-4 w-4' />
              <span className='hidden sm:inline'>Status</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value='account'>
            <AccountTabContent />
          </TabsContent>

          <TabsContent value='sessions'>
            <SessionsTabContent />
          </TabsContent>

          <TabsContent value='preferences'>
            <PreferencesTabContent />
          </TabsContent>

          <TabsContent value='domains'>
            <DomainsContent />
          </TabsContent>

          <TabsContent value='settings'>
            <SystemSettingsContent />
          </TabsContent>

          <TabsContent value='users'>
            <SystemUsersContent />
          </TabsContent>

          <TabsContent value='status'>
            <SystemStatusContent />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
