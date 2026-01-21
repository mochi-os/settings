import { useState } from 'react'
import { format } from 'date-fns'
import type { Passkey, TotpSetupResponse } from '@/types/account'
import { startRegistration } from '@simplewebauthn/browser'
import {
  Check,
  Copy,
  Key,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Shield,
  Smartphone,
  Trash2,
  User,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
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
  useSetMethods,
  useTotpDisable,
  useTotpSetup,
  useTotpStatus,
  useTotpVerify,
} from '@/hooks/use-account'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,

  Skeleton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  PageHeader,
  Main,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
  usePageTitle,

  getErrorMessage,
  toast,
} from '@mochi/common'

function formatTimestamp(timestamp: number): string {
  if (timestamp === 0) return 'Never'
  return format(new Date(timestamp * 1000), 'yyyy-MM-dd HH:mm')
}

// ============================================================================
// Identity Section
// ============================================================================

function IdentitySection() {
  const { data, isLoading } = useAccountData()

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <User className='h-5 w-5' />
          Identity
        </CardTitle>
        <CardDescription>
          Your personal account information
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className='space-y-4'>
            <Skeleton className='h-14 w-full' />
            <Skeleton className='h-14 w-full' />
            <Skeleton className='h-14 w-full' />
            <Skeleton className='h-14 w-full' />
          </div>
        ) : data?.identity ? (
          <div className='space-y-4'>
            <div className='border-b pb-4 last:border-b-0 last:pb-0'>
              <dt className='text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wider'>
                Name
              </dt>
              <dd className='text-foreground text-base font-medium'>
                {data.identity.name}
              </dd>
            </div>
            <div className='border-b pb-4 last:border-b-0 last:pb-0'>
              <dt className='text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wider'>
                Username
              </dt>
              <dd className='text-foreground text-base font-medium'>
                {data.identity.username}
              </dd>
            </div>
            <div className='border-b pb-4 last:border-b-0 last:pb-0'>
              <dt className='text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wider'>
                Fingerprint
              </dt>
              <dd className='text-foreground font-mono text-sm'>
                {data.identity.fingerprint}
              </dd>
            </div>
            <div className='border-b pb-4 last:border-b-0 last:pb-0'>
              <dt className='text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wider'>
                Entity ID
              </dt>
              <dd className='text-foreground break-all font-mono text-sm'>
                {data.identity.entity}
              </dd>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Login Requirements Section
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
        toast.error(getErrorMessage(error, 'Failed to update login requirements'))
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Shield className='h-5 w-5' />
          Login requirements
        </CardTitle>
        <CardDescription>
          Require all selected methods to log in
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className='space-y-4'>
            <Skeleton className='h-16 w-full' />
            <Skeleton className='h-16 w-full' />
            <Skeleton className='h-16 w-full' />
          </div>
        ) : (
          <div className='space-y-0 divide-y'>
            <div className='flex items-center justify-between py-4 first:pt-0 last:pb-0'>
              <div className='space-y-1 pr-4'>
                <Label htmlFor='method-passkey' className='text-sm font-medium'>
                  Passkey
                </Label>
                <p className='text-muted-foreground text-xs leading-relaxed'>
                  {hasPasskey
                    ? 'Use a registered passkey to sign in'
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

            <div className='flex items-center justify-between py-4 first:pt-0 last:pb-0'>
              <div className='space-y-1 pr-4'>
                <Label htmlFor='method-totp' className='text-sm font-medium'>
                  Authenticator app
                </Label>
                <p className='text-muted-foreground text-xs leading-relaxed'>
                  {hasTOTP
                    ? 'Use an authenticator app code to sign in'
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

            <div className='flex items-center justify-between py-4 first:pt-0 last:pb-0'>
              <div className='space-y-1 pr-4'>
                <Label htmlFor='method-email' className='text-sm font-medium'>
                  Email code
                </Label>
                <p className='text-muted-foreground text-xs leading-relaxed'>
                  Receive a verification code by email
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
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Passkeys Section
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
                <AlertDialogAction variant='destructive' onClick={() => onDelete(passkey.id)}>
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
        toast.error(getErrorMessage(error, 'Failed to register passkey'))
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
        onError: (error) => toast.error(getErrorMessage(error, 'Failed to rename passkey')),
      }
    )
  }

  const handleDelete = (id: string) => {
    deletePasskey.mutate(id, {
      onSuccess: () => toast.success('Passkey deleted'),
      onError: (error) => toast.error(getErrorMessage(error, 'Failed to delete passkey')),
    })
  }

  const passkeys = data?.passkeys ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Key className='h-5 w-5' />
          Passkeys
        </CardTitle>
        <CardDescription>
          Sign in without a password using biometrics or security keys
        </CardDescription>
        <CardAction>
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
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className='space-y-3'>
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-10 w-full' />
          </div>
        ) : passkeys.length === 0 ? (
          <div className='bg-muted/50 rounded-lg border border-dashed p-8 text-center'>
            <Key className='text-muted-foreground mx-auto mb-3 h-10 w-10 opacity-50' />
            <p className='text-muted-foreground mb-1 text-sm font-medium'>
              No passkeys registered
            </p>
            <p className='text-muted-foreground text-xs'>
              Add a passkey to sign in without a password
            </p>
          </div>
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
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Authenticator App Section
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
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to set up authenticator'))
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
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to verify code'))
    } finally {
      setIsVerifying(false)
    }
  }

  const handleDisable = () => {
    disableTotp.mutate(undefined, {
      onSuccess: () => toast.success('Authenticator app disabled'),
      onError: (error) => toast.error(getErrorMessage(error, 'Failed to disable authenticator')),
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
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Smartphone className='h-5 w-5' />
          Authenticator app
        </CardTitle>
        <CardDescription>
          Use time-based codes from an authenticator app
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className='h-16 w-full' />
        ) : setupData ? (
          <div className='space-y-6'>
            <div className='space-y-3'>
              <p className='text-sm font-medium'>
                Scan this QR code with your TOTP authenticator app
              </p>
              <div className='flex justify-center rounded-xl border-2 bg-white p-6 shadow-sm'>
                <QRCodeSVG value={setupData.url} size={200} />
              </div>
            </div>
            <div className='space-y-2.5'>
              <Label className='text-sm font-medium'>
                Or enter this secret manually
              </Label>
              <div className='flex items-center gap-2'>
                <code className='bg-muted flex-1 rounded-md border px-3 py-2 font-mono text-sm'>
                  {setupData.secret}
                </code>
                <Button variant='outline' size='sm' onClick={handleCopySecret}>
                  <Copy className='h-4 w-4' />
                </Button>
              </div>
            </div>
            <div className='border-t pt-4 space-y-2.5'>
              <Label htmlFor='totp-verify' className='text-sm font-medium'>
                Enter verification code
              </Label>
              <div className='flex items-center gap-2'>
                <Input
                  id='totp-verify'
                  placeholder='000000'
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  className='w-32 font-mono text-center text-lg tracking-widest'
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
          <div className='flex items-center justify-between rounded-lg border bg-green-50 dark:bg-green-950/20 px-4 py-3'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30'>
                <Check className='h-5 w-5 text-green-600 dark:text-green-500' />
              </div>
              <div>
                <p className='text-sm font-medium text-green-900 dark:text-green-100'>
                  Authenticator app is active
                </p>
                <p className='text-muted-foreground text-xs'>
                  Your account is protected with 2FA
                </p>
              </div>
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
          <div className='flex items-center justify-between rounded-lg border border-dashed bg-muted/30 px-4 py-6'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-full bg-muted'>
                <Smartphone className='text-muted-foreground h-5 w-5' />
              </div>
              <p className='text-muted-foreground text-sm'>
                Add an authenticator app for additional security
              </p>
            </div>
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
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Recovery Codes Section
// ============================================================================

function RecoveryCodesSection() {
  const { data, isLoading } = useRecoveryStatus()
  const generateCodes = useRecoveryGenerate()
  const [showCodes, setShowCodes] = useState<string[] | null>(null)

  const handleGenerate = async () => {
    try {
      const result = await generateCodes.mutateAsync()
      setShowCodes(result.codes)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to generate recovery codes'))
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
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <RefreshCw className='h-5 w-5' />
          Recovery codes
        </CardTitle>
        <CardDescription>
          One-time use codes for account recovery
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className='h-16 w-full' />
        ) : showCodes ? (
          <div className='space-y-5'>
            <div className='rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-4'>
              <p className='flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-100'>
                <Shield className='h-4 w-4' />
                Save these recovery codes in a secure place
              </p>
              <p className='text-muted-foreground mt-1 text-xs'>
                Each code can only be used once. Store them safely.
              </p>
            </div>
            <div className='bg-muted/50 rounded-xl border-2 p-5'>
              <div className='grid grid-cols-2 gap-3 font-mono text-sm'>
                {showCodes.map((code, i) => (
                  <div
                    key={i}
                    className='bg-background flex items-center justify-center rounded-md border px-3 py-2.5 font-semibold tracking-wide shadow-sm'
                  >
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
            <div className='flex-1'>
              {count > 0 ? (
                <div className='flex items-center gap-3'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30'>
                    <RefreshCw className='h-5 w-5 text-blue-600 dark:text-blue-500' />
                  </div>
                  <div>
                    <p className='text-sm font-medium'>
                      {count} code{count !== 1 ? 's' : ''} remaining
                    </p>
                    <p className='text-muted-foreground text-xs leading-relaxed'>
                      Use a recovery code if you lose access to other methods
                    </p>
                  </div>
                </div>
              ) : (
                <div className='flex items-center gap-3'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-full bg-muted'>
                    <RefreshCw className='text-muted-foreground h-5 w-5' />
                  </div>
                  <p className='text-muted-foreground text-sm'>
                    Generate recovery codes as a backup login method
                  </p>
                </div>
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
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function UserAccount() {
  usePageTitle('Account')
  const { error } = useAccountData()

  if (error) {
    return (
      <>
        <PageHeader title="Account" icon={<User className='size-4 md:size-5' />} />
        <Main>
          <p className='text-muted-foreground'>
            Failed to load account information
          </p>
        </Main>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Account" icon={<User className='size-4 md:size-5' />} />

      <Main>
        <div className='space-y-8'>
          <IdentitySection />
          <LoginRequirementsSection />
          <PasskeysSection />
          <AuthenticatorSection />
          <RecoveryCodesSection />
        </div>
      </Main>
    </>
  )
}
