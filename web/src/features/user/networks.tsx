// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
//
// The Networks page: the user's handles, the hosted account each network makes
// of a handle, and the accounts linked on other servers, all in one place.
import { useEffect, useMemo, useState } from 'react'
import type {
  Block,
  Availability,
  Handle,
  Mute,
  NetworkAccount,
  NetworkProvider,
} from '@/types/networks'
import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  Badge,
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  FieldRow,
  GeneralError,
  Input,
  Label,
  ListSkeleton,
  Main,
  PageHeader,
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  Section,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  getErrorMessage,
  naturalCompare,
  shellNavigateTop,
  toast,
  useDebounce,
  useFormat,
  usePageTitle,
} from '@mochi/web'
import {
  Bot,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  LogIn,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Share2,
  Trash2,
  Zap,
} from 'lucide-react'
import { suggestHandle } from '@/lib/handles'
import { networkLabel } from '@/lib/networks'
import {
  useAccountCreate,
  useAccountKeys,
  useAccountKeysRecovery,
  useAccountKeysReplace,
  useAccountLink,
  useAccountPassword,
  useAccountRemove,
  useAccountTest,
  useAccountUpdate,
  useBlockAdd,
  useBlockRemove,
  useHandleAvailable,
  useHandleRelease,
  useHandleReserve,
  useMuteRemove,
  useNetworksData,
} from '@/hooks/use-networks'

// Why a name cannot be reserved, in the user's words.
function availabilityReason(reason: string): string {
  switch (reason) {
    case 'invalid':
      return i18n._(
        msg`Letters and digits only, starting with a letter, 3 to 20 characters`
      )
    case 'domain':
      return i18n._(msg`You cannot reserve a name on this domain`)
    case 'blocked':
      return i18n._(msg`That name is kept for the server`)
    case 'protected':
      return i18n._(msg`That name is for administrators`)
    case 'taken':
      return i18n._(msg`That name is taken`)
    case 'parent':
      return i18n._(msg`The handle this name sits under is not yours`)
    case 'limit':
      return i18n._(msg`You have reached your limit of handles`)
  }
  return i18n._(msg`That name is not available`)
}

// A linked account's remote server returns the browser to this page with the
// account's id, or with why the link did not happen.
function useLinkResult() {
  const { t } = useLingui()
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const linked = params.get('linked')
    const errored = params.get('link_error')
    if (!linked && !errored) return
    setTimeout(() => {
      if (linked) {
        toast.success(t`Account linked`)
      } else if (errored === 'access_denied') {
        toast.error(t`The server did not allow the link`)
      } else {
        toast.error(t`Could not link the account`)
      }
    }, 0)
  }, [t])
}

// The check an input runs as the user types, and its answer.
function useAvailability(name: string, domain: string) {
  const check = useHandleAvailable()
  const debounced = useDebounce(name, 400)
  const [result, setResult] = useState<Availability | null>(null)
  const [checking, setChecking] = useState(false)
  useEffect(() => {
    if (!debounced) {
      setResult(null)
      return
    }
    let cancelled = false
    setChecking(true)
    check(debounced, domain)
      .then((answer) => {
        if (!cancelled) setResult(answer)
      })
      .catch(() => {
        if (!cancelled) setResult(null)
      })
      .finally(() => {
        if (!cancelled) setChecking(false)
      })
    return () => {
      cancelled = true
    }
    // check is a stable wrapper around the endpoint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, domain])
  const current = result && result.name === debounced ? result : null
  return { result: current, checking: checking || debounced !== name }
}

function AvailabilityNote({
  result,
  checking,
}: {
  result: Availability | null
  checking: boolean
}) {
  if (checking) {
    return (
      <p className='text-muted-foreground text-sm'>
        <Trans>Checking…</Trans>
      </p>
    )
  }
  if (!result) return null
  if (result.available) {
    return (
      <p className='text-success text-sm'>
        <Trans>Available</Trans>
      </p>
    )
  }
  return (
    <p className='text-destructive text-sm'>
      {availabilityReason(result.reason)}
    </p>
  )
}

// Choosing a handle: the field with its live check, a suggestion from the
// person's name, and a confirmation, since a handle is permanent. The owner's
// handles page uses it too, to take a name.
export function HandleChooser({
  domains,
  suggestion,
  title,
  onReserved,
}: {
  domains: string[]
  suggestion: string
  title?: string
  onReserved: () => void
}) {
  const { t } = useLingui()
  const [name, setName] = useState(suggestion)
  const [domain, setDomain] = useState(domains[0] ?? '')
  const [confirming, setConfirming] = useState(false)
  const reserve = useHandleReserve()
  const { result, checking } = useAvailability(name, domain)
  const address = domain ? `${name}@${domain}` : name

  const handleReserve = async () => {
    try {
      await reserve.mutateAsync({ name, domain })
      toast.success(t`Handle reserved`)
      setName('')
      onReserved()
    } catch (error) {
      toast.error(getErrorMessage(error, t`Could not reserve the handle`))
    }
  }

  return (
    <div className='mb-6 rounded-lg border p-4'>
      <h2 className='mb-3 text-base font-medium'>
        {title ?? <Trans>Choose a handle</Trans>}
      </h2>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
        <div className='grid flex-1 gap-2'>
          <Label htmlFor='handle-name'>
            <Trans>Handle</Trans>
          </Label>
          <Input
            id='handle-name'
            value={name}
            autoComplete='off'
            onChange={(e) => setName(e.target.value.trim().toLowerCase())}
          />
        </div>
        {domains.length > 1 && (
          <div className='grid gap-2'>
            <Label htmlFor='handle-domain'>
              <Trans>Domain</Trans>
            </Label>
            <Select value={domain} onValueChange={setDomain}>
              <SelectTrigger id='handle-domain' className='w-56'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {domains.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button
          disabled={!result?.available || checking || reserve.isPending}
          onClick={() => setConfirming(true)}
        >
          {reserve.isPending ? (
            <Loader2 className='size-4 animate-spin' />
          ) : (
            <Check className='size-4' />
          )}
          <Trans>Reserve</Trans>
        </Button>
      </div>
      <div className='mt-2 min-h-5'>
        <AvailabilityNote result={result} checking={checking && !!name} />
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t`Reserve this handle?`}
        desc={t`"${address}" will be yours on every network this server offers. A handle cannot be renamed; releasing it later removes its accounts and their followers.`}
        confirmText={t`Reserve`}
        icon={<Check className='size-4' />}
        handleConfirm={async () => {
          setConfirming(false)
          await handleReserve()
        }}
      />
    </div>
  )
}

// A name under a handle, by its suffix: alice_news under alice.
function AddNameDialog({
  parent,
  onOpenChange,
  onAdded,
}: {
  parent: Handle
  onOpenChange: (open: boolean) => void
  onAdded: () => void
}) {
  const { t } = useLingui()
  const [suffix, setSuffix] = useState('')
  const name = suffix ? `${parent.name}_${suffix}` : ''
  const { result, checking } = useAvailability(name, parent.domain)
  const reserve = useHandleReserve()

  const handleAdd = async () => {
    try {
      await reserve.mutateAsync({ name, domain: parent.domain })
      toast.success(t`Name added`)
      onAdded()
      onOpenChange(false)
    } catch (error) {
      toast.error(getErrorMessage(error, t`Could not add the name`))
    }
  }

  return (
    <ResponsiveDialog open onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className='sm:max-w-[425px]'>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            <Trans>Add a name under {parent.name}</Trans>
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className='grid gap-2 py-4'>
          <Label htmlFor='name-suffix'>
            <Trans>Name</Trans>
          </Label>
          <div className='flex items-center gap-1'>
            <span className='text-muted-foreground text-sm'>
              {parent.name}_
            </span>
            <Input
              id='name-suffix'
              value={suffix}
              autoComplete='off'
              onChange={(e) =>
                setSuffix(
                  e.target.value
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, '')
                )
              }
            />
          </div>
          <div className='min-h-5'>
            <AvailabilityNote result={result} checking={checking && !!suffix} />
          </div>
        </div>
        <ResponsiveDialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            disabled={!result?.available || checking || reserve.isPending}
            onClick={() => void handleAdd()}
          >
            {reserve.isPending ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <Plus className='size-4' />
            )}
            <Trans>Add</Trans>
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

// One handle with the names under it: a switch per network, each naming the
// address switching it on creates.
function HandleCard({
  handle,
  children,
  networks,
  accounts,
  onToggle,
  onRelease,
  onAddName,
  busy,
}: {
  handle: Handle
  children: Handle[]
  networks: string[]
  accounts: NetworkAccount[]
  onToggle: (
    handle: Handle,
    network: string,
    account: NetworkAccount | undefined
  ) => void
  onRelease: (handle: Handle) => void
  onAddName: (handle: Handle) => void
  busy: string | null
}) {
  const { t } = useLingui()
  const { domain } = handle
  const rows = [handle, ...children]
  const hosted = (h: Handle, network: string) =>
    accounts.find(
      (a) =>
        a.hosted && a.type === network && a.identifier === h.addresses[network]
    )
  return (
    <Section
      title={handle.name}
      description={t`Handle on ${domain}`}
      className='mb-4'
      action={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              icon={<MoreHorizontal className='h-4 w-4' />}
              aria-label={t`Handle actions`}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={() => onAddName(handle)}>
              <Plus className='me-2 h-4 w-4' />
              <Trans>Add a name</Trans>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRelease(handle)}>
              <Trash2 className='me-2 h-4 w-4' />
              <Trans>Release</Trans>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      {rows.map((row) =>
        networks.map((type) => {
          const account = hosted(row, type)
          const key = `${row.name}/${type}`
          const { name } = row
          const network = networkLabel(type)
          return (
            <FieldRow
              key={key}
              inline
              label={row === handle ? network : t`${name} on ${network}`}
              description={row.addresses[type]}
            >
              <Switch
                checked={!!account}
                disabled={busy === key}
                aria-label={t`${network} for ${name}`}
                onCheckedChange={() => onToggle(row, type, account)}
              />
            </FieldRow>
          )
        })
      )}
    </Section>
  )
}

// Linking an existing account: the network, then what its provider's form
// asks; a server's consent takes the browser away and brings it back.
function LinkDialog({
  providers,
  onOpenChange,
  onLinked,
}: {
  providers: NetworkProvider[]
  onOpenChange: (open: boolean) => void
  onLinked: () => void
}) {
  const { t } = useLingui()
  const [type, setType] = useState(providers[0]?.type ?? '')
  const [fields, setFields] = useState<Record<string, string>>({})
  const link = useAccountLink()
  const provider = providers.find((p) => p.type === type)
  const complete = (provider?.link.fields ?? []).every(
    (f) => !f.required || (fields[f.name] ?? '').trim() !== ''
  )

  const handleLink = async () => {
    try {
      const answer = await link.mutateAsync({ type, ...fields })
      if (answer.url) {
        shellNavigateTop(answer.url)
        return
      }
      toast.success(t`Account linked`)
      onLinked()
      onOpenChange(false)
    } catch (error) {
      toast.error(getErrorMessage(error, t`Could not link the account`))
    }
  }

  return (
    <ResponsiveDialog open onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className='sm:max-w-[425px]'>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            <Trans>Link an account</Trans>
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='link-network'>
              <Trans>Network</Trans>
            </Label>
            <Select
              value={type}
              onValueChange={(value) => {
                setType(value)
                setFields({})
              }}
            >
              <SelectTrigger id='link-network'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.type} value={p.type}>
                    {networkLabel(p.type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {provider?.link.fields.map((field) => (
            <div key={field.name} className='grid gap-2'>
              <Label htmlFor={`link-${field.name}`}>{field.label}</Label>
              <Input
                id={`link-${field.name}`}
                type={field.type === 'password' ? 'password' : 'text'}
                value={fields[field.name] ?? ''}
                placeholder={field.placeholder}
                autoComplete={field.type === 'password' ? 'off' : undefined}
                onChange={(e) =>
                  setFields({ ...fields, [field.name]: e.target.value })
                }
              />
            </div>
          ))}
        </div>
        <ResponsiveDialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            disabled={!provider || !complete || link.isPending}
            onClick={() => void handleLink()}
          >
            {link.isPending ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <Link2 className='size-4' />
            )}
            {provider?.link.flow === 'oauth' ? (
              <Trans>Continue</Trans>
            ) : (
              <Trans>Link</Trans>
            )}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

// The name an account's profile shows.
function RenameDialog({
  account,
  onOpenChange,
}: {
  account: NetworkAccount
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useLingui()
  const [label, setLabel] = useState(account.label || account.name || '')
  const update = useAccountUpdate()
  const handleSave = async () => {
    try {
      await update.mutateAsync({ id: account.id, label })
      toast.success(t`Account updated`)
      onOpenChange(false)
    } catch (error) {
      toast.error(getErrorMessage(error, t`Could not update the account`))
    }
  }
  return (
    <ResponsiveDialog open onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className='sm:max-w-[425px]'>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            <Trans>Profile</Trans>
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className='grid gap-2 py-4'>
          <Label htmlFor='account-name'>
            <Trans>Name</Trans>
          </Label>
          <Input
            id='account-name'
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <ResponsiveDialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            disabled={
              update.isPending || label.trim() === (account.label || '')
            }
            onClick={() => void handleSave()}
          >
            {update.isPending ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <Check className='size-4' />
            )}
            <Trans>Save</Trans>
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

// A hosted account's keys: what it signs with, replaced here, and on Bluesky
// the recovery key the user keeps.
function KeysDialog({
  account,
  onOpenChange,
}: {
  account: NetworkAccount
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useLingui()
  const { formatTimestamp } = useFormat()
  const keys = useAccountKeys(account.id)
  const replace = useAccountKeysReplace()
  const recovery = useAccountKeysRecovery()
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [confirmRecovery, setConfirmRecovery] = useState(false)
  const [secret, setSecret] = useState('')
  const list = Array.isArray(keys.data) ? keys.data : []

  const handleReplace = async () => {
    try {
      await replace.mutateAsync(account.id)
      toast.success(t`Keys replaced`)
    } catch (error) {
      toast.error(getErrorMessage(error, t`Could not replace the keys`))
    }
  }
  const handleRecovery = async () => {
    try {
      const made = await recovery.mutateAsync(account.id)
      setSecret(made.private)
    } catch (error) {
      toast.error(getErrorMessage(error, t`Could not make the recovery key`))
    }
  }
  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret)
      toast.success(t`Copied`)
    } catch {
      toast.error(t`Could not copy`)
    }
  }

  return (
    <ResponsiveDialog open onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className='sm:max-w-[520px]'>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            <Trans context='cryptographic'>Keys</Trans>
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className='grid gap-4 py-4'>
          {keys.isLoading ? (
            <ListSkeleton />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Trans>Kind</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Algorithm</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Created</Trans>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((key) => (
                  <TableRow key={key.kind}>
                    <TableCell>{key.kind}</TableCell>
                    <TableCell>{key.algorithm}</TableCell>
                    <TableCell className='text-muted-foreground'>
                      {formatTimestamp(key.created)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {secret && (
            <div className='grid gap-2'>
              <Label htmlFor='recovery-key'>
                <Trans>Recovery key</Trans>
              </Label>
              <div className='flex gap-2'>
                <Input id='recovery-key' readOnly value={secret} />
                <Button
                  variant='outline'
                  onClick={() => void copySecret()}
                  aria-label={t`Copy`}
                  icon={<Copy className='size-4' />}
                />
              </div>
              <p className='text-muted-foreground text-sm'>
                <Trans>
                  Shown once. Keep it somewhere safe: it is not stored here.
                </Trans>
              </p>
            </div>
          )}
        </div>
        <ResponsiveDialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            <Trans>Close</Trans>
          </Button>
          {account.type === 'bluesky' && (
            <Button
              variant='outline'
              disabled={recovery.isPending}
              onClick={() => setConfirmRecovery(true)}
            >
              <KeyRound className='size-4' />
              <Trans>Recovery key</Trans>
            </Button>
          )}
          <Button
            variant='outline'
            disabled={replace.isPending}
            onClick={() => setConfirmReplace(true)}
          >
            <Trans>Replace keys</Trans>
          </Button>
        </ResponsiveDialogFooter>
        <ConfirmDialog
          open={confirmReplace}
          onOpenChange={setConfirmReplace}
          title={t`Replace the keys?`}
          desc={t`Other servers learn the new key from the account's document. Anything signed with the old key stops checking.`}
          confirmText={t`Replace`}
          icon={<KeyRound className='size-4' />}
          destructive
          handleConfirm={async () => {
            setConfirmReplace(false)
            await handleReplace()
          }}
        />
        <ConfirmDialog
          open={confirmRecovery}
          onOpenChange={setConfirmRecovery}
          title={t`Make a recovery key?`}
          desc={t`A recovery key lets you move the account or undo what a compromised server did. It replaces any earlier one and is shown once.`}
          confirmText={t`Make key`}
          icon={<KeyRound className='size-4' />}
          handleConfirm={async () => {
            setConfirmRecovery(false)
            await handleRecovery()
          }}
        />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

// Signing in from another app (decision 7): the server to give it, the
// account's address, and a password minted for the device, shown once.
function serverAddress(account: NetworkAccount): string {
  const domain = account.domain || account.server || ''
  switch (account.type) {
    case 'xmpp':
      return domain
    default:
      return domain ? `https://${domain}` : ''
  }
}

export function PasswordDialog({
  account,
  onOpenChange,
}: {
  account: NetworkAccount
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useLingui()
  const mint = useAccountPassword()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')

  const handleMint = async () => {
    try {
      const made = await mint.mutateAsync({ id: account.id, name: name.trim() })
      setPassword(made.password)
    } catch (error) {
      toast.error(getErrorMessage(error, t`Could not make the password`))
    }
  }
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(t`Copied`)
    } catch {
      toast.error(t`Could not copy`)
    }
  }

  return (
    <ResponsiveDialog open onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className='sm:max-w-[480px]'>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            <Trans>Sign in from another app</Trans>
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='password-server'>
              <Trans>Server</Trans>
            </Label>
            <div className='flex gap-2'>
              <Input
                id='password-server'
                readOnly
                value={serverAddress(account)}
              />
              <Button
                variant='outline'
                onClick={() => void copy(serverAddress(account))}
                aria-label={t`Copy`}
                icon={<Copy className='size-4' />}
              />
            </div>
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='password-address'>
              <Trans>Address</Trans>
            </Label>
            <div className='flex gap-2'>
              <Input
                id='password-address'
                readOnly
                value={account.identifier}
              />
              <Button
                variant='outline'
                onClick={() => void copy(account.identifier)}
                aria-label={t`Copy`}
                icon={<Copy className='size-4' />}
              />
            </div>
          </div>
          {password ? (
            <div className='grid gap-2'>
              <Label htmlFor='password-value'>
                <Trans>Password</Trans>
              </Label>
              <div className='flex gap-2'>
                <Input id='password-value' readOnly value={password} />
                <Button
                  variant='outline'
                  onClick={() => void copy(password)}
                  aria-label={t`Copy`}
                  icon={<Copy className='size-4' />}
                />
              </div>
              <p className='text-muted-foreground text-sm'>
                <Trans>Shown once. Type it as the password in the app.</Trans>
              </p>
            </div>
          ) : (
            <div className='grid gap-2'>
              <Label htmlFor='password-device'>
                <Trans>Device</Trans>
              </Label>
              <Input
                id='password-device'
                value={name}
                autoComplete='off'
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
        </div>
        <ResponsiveDialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            <Trans>Close</Trans>
          </Button>
          {!password && (
            <Button
              disabled={!name.trim() || mint.isPending}
              onClick={() => void handleMint()}
            >
              {mint.isPending ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <KeyRound className='size-4' />
              )}
              <Trans>Make password</Trans>
            </Button>
          )}
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

function AccountRow({
  account,
  onRename,
  onKeys,
  onPassword,
  onTest,
  onProfile,
  onAutomated,
  onRemove,
  busy,
}: {
  account: NetworkAccount
  onRename: (account: NetworkAccount) => void
  onKeys: (account: NetworkAccount) => void
  onPassword: (account: NetworkAccount) => void
  onTest: (account: NetworkAccount) => void
  onProfile: (account: NetworkAccount) => void
  onAutomated: (account: NetworkAccount) => void
  onRemove: (account: NetworkAccount) => void
  busy: string | null
}) {
  const { t } = useLingui()
  const chat = account.type === 'xmpp' || account.type === 'matrix'
  return (
    <TableRow>
      <TableCell className='font-medium'>{account.identifier}</TableCell>
      <TableCell>{account.label || account.name || ''}</TableCell>
      <TableCell>{networkLabel(account.type)}</TableCell>
      <TableCell>
        <Badge variant='outline'>
          {account.hosted ? <Trans>Hosted</Trans> : <Trans>Linked</Trans>}
        </Badge>
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {account.error ? (
          <span className='text-destructive'>{account.error}</span>
        ) : !account.hosted && chat ? (
          account.connected ? (
            <Trans>Connected</Trans>
          ) : (
            <Trans>Not connected</Trans>
          )
        ) : (
          account.server
        )}
      </TableCell>
      <TableCell className='text-end'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              loading={busy === account.id}
              icon={<MoreHorizontal className='h-4 w-4' />}
              aria-label={t`Account actions`}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={() => onRename(account)}>
              <Pencil className='me-2 h-4 w-4' />
              <Trans>Profile</Trans>
            </DropdownMenuItem>
            {account.hosted ? (
              <>
                <DropdownMenuItem onClick={() => onPassword(account)}>
                  <LogIn className='me-2 h-4 w-4' />
                  <Trans>Sign in from another app</Trans>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onKeys(account)}>
                  <KeyRound className='me-2 h-4 w-4' />
                  <Trans context='cryptographic'>Keys</Trans>
                </DropdownMenuItem>
                {account.type === 'fediverse' && (
                  <DropdownMenuItem onClick={() => onAutomated(account)}>
                    <Bot className='me-2 h-4 w-4' />
                    {account.automated ? (
                      <Trans>Mark as a person</Trans>
                    ) : (
                      <Trans>Mark as automated</Trans>
                    )}
                  </DropdownMenuItem>
                )}
              </>
            ) : (
              <DropdownMenuItem onClick={() => onTest(account)}>
                <Zap className='me-2 h-4 w-4' />
                <Trans>Test</Trans>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onProfile(account)}>
              {account.profile ? (
                <EyeOff className='me-2 h-4 w-4' />
              ) : (
                <Eye className='me-2 h-4 w-4' />
              )}
              {account.profile ? (
                <Trans>Hide from profile</Trans>
              ) : (
                <Trans>Show on profile</Trans>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRemove(account)}>
              <Trash2 className='me-2 h-4 w-4' />
              <Trans>Remove</Trans>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

// What the user has blocked and muted on other networks (phase 16): a
// domain blocked here, a person blocked or muted from their comment in feeds,
// each lifted here.
function ModerationSection({
  blocks,
  mutes,
}: {
  blocks: Block[]
  mutes: Mute[]
}) {
  const { t } = useLingui()
  const add = useBlockAdd()
  const removeBlock = useBlockRemove()
  const removeMute = useMuteRemove()
  const [domain, setDomain] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const run = async (
    key: string,
    call: () => Promise<unknown>,
    done: string
  ) => {
    setBusy(key)
    try {
      await call()
      toast.success(done)
    } catch (err) {
      toast.error(getErrorMessage(err, t`Could not change the block`))
    } finally {
      setBusy(null)
    }
  }

  const rows: { key: string; label: string; kind: 'block' | 'mute' }[] = [
    ...blocks.map((b) => ({
      key: b.domain ?? b.actor ?? '',
      label: b.domain ?? b.actor ?? '',
      kind: 'block' as const,
    })),
    ...mutes.map((m) => ({
      key: m.actor,
      label: m.actor,
      kind: 'mute' as const,
    })),
  ]

  return (
    <Section title={t`Blocked and muted`} className='mb-4'>
      <form
        className='flex gap-2 py-2'
        onSubmit={(event) => {
          event.preventDefault()
          const target = domain.trim()
          if (!target) return
          void run('add', () => add.mutateAsync(target), t`Blocked`).then(() =>
            setDomain('')
          )
        }}
      >
        <Input
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
          placeholder='example.social'
          aria-label={t`Domain to block`}
          autoComplete='off'
        />
        <Button
          type='submit'
          variant='outline'
          disabled={busy === 'add' || !domain.trim()}
        >
          {busy === 'add' ? (
            <Loader2 className='size-4 animate-spin' />
          ) : (
            <Plus className='size-4' />
          )}
          <Trans>Block</Trans>
        </Button>
      </form>
      {rows.map((row) => {
        const label = row.label
        return (
          <FieldRow
            key={`${row.kind}:${row.key}`}
            inline
            label={row.label}
            description={row.kind === 'mute' ? t`Muted` : t`Blocked`}
          >
            <Button
              variant='ghost'
              size='sm'
              icon={<Trash2 className='h-4 w-4' />}
              aria-label={
                row.kind === 'mute' ? t`Unmute ${label}` : t`Unblock ${label}`
              }
              disabled={busy === row.key}
              onClick={() =>
                void run(
                  row.key,
                  () =>
                    row.kind === 'mute'
                      ? removeMute.mutateAsync(row.key)
                      : removeBlock.mutateAsync(row.key),
                  row.kind === 'mute' ? t`Unmuted` : t`Unblocked`
                )
              }
            />
          </FieldRow>
        )
      })}
    </Section>
  )
}

export function Networks() {
  const { t } = useLingui()
  usePageTitle(t`Networks`)
  useLinkResult()
  const { data, isLoading, error, refetch } = useNetworksData()
  const create = useAccountCreate()
  const remove = useAccountRemove()
  const release = useHandleRelease()
  const test = useAccountTest()
  const shown = useAccountUpdate()

  const [linking, setLinking] = useState(false)
  const [adding, setAdding] = useState<Handle | null>(null)
  const [releasing, setReleasing] = useState<Handle | null>(null)
  const [renaming, setRenaming] = useState<NetworkAccount | null>(null)
  const [keysFor, setKeysFor] = useState<NetworkAccount | null>(null)
  const [passwordFor, setPasswordFor] = useState<NetworkAccount | null>(null)
  const [removing, setRemoving] = useState<NetworkAccount | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const networks = data?.networks ?? []
  const accounts = useMemo(
    () =>
      [...(data?.accounts ?? [])].sort((a, b) =>
        naturalCompare(a.identifier, b.identifier)
      ),
    [data]
  )
  const handles = data?.handles.handles ?? []
  const parents = handles
    .filter((h) => h.kind === 'handle' && !h.parent)
    .sort((a, b) => naturalCompare(a.name, b.name))
  const childrenOf = (parent: Handle) =>
    handles
      .filter(
        (h) =>
          h.kind === 'handle' &&
          h.parent === parent.name &&
          h.domain === parent.domain
      )
      .sort((a, b) => naturalCompare(a.name, b.name))
  const mayReserve =
    networks.length > 0 &&
    (data?.handles.unlimited ||
      (data?.handles.counted ?? 0) < (data?.handles.limit ?? 0))

  const handleToggle = async (
    handle: Handle,
    network: string,
    account: NetworkAccount | undefined
  ) => {
    if (account) {
      setRemoving(account)
      return
    }
    const key = `${handle.name}/${network}`
    setBusy(key)
    try {
      await create.mutateAsync({
        network,
        handle: handle.name,
        domain: handle.domain,
      })
      toast.success(t`Account created`)
    } catch (err) {
      toast.error(getErrorMessage(err, t`Could not create the account`))
    } finally {
      setBusy(null)
    }
  }

  const handleRemove = async (account: NetworkAccount) => {
    setBusy(account.id)
    try {
      await remove.mutateAsync(account.id)
      toast.success(t`Account removed`)
    } catch (err) {
      toast.error(getErrorMessage(err, t`Could not remove the account`))
    } finally {
      setBusy(null)
    }
  }

  const handleRelease = async (handle: Handle) => {
    try {
      await release.mutateAsync({ name: handle.name, domain: handle.domain })
      toast.success(t`Handle released`)
    } catch (err) {
      toast.error(getErrorMessage(err, t`Could not release the handle`))
    }
  }

  // Whether the account is linked from the profile page with rel="me".
  const handleProfile = async (account: NetworkAccount) => {
    setBusy(account.id)
    try {
      await shown.mutateAsync({ id: account.id, profile: !account.profile })
    } catch (err) {
      toast.error(getErrorMessage(err, t`Could not change the profile`))
    } finally {
      setBusy(null)
    }
  }

  // Whether a hosted account is shown on its network as automated: fed by
  // sources rather than the person (decision 30 of the federation plan).
  const handleAutomated = async (account: NetworkAccount) => {
    setBusy(account.id)
    try {
      await shown.mutateAsync({ id: account.id, automated: !account.automated })
    } catch (err) {
      toast.error(getErrorMessage(err, t`Could not change the account`))
    } finally {
      setBusy(null)
    }
  }

  const handleTest = async (account: NetworkAccount) => {
    setBusy(account.id)
    try {
      const result = await test(account.id)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (err) {
      toast.error(getErrorMessage(err, t`Test failed`))
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageHeader
        title={t`Networks`}
        icon={<Share2 className='size-4 md:size-5' />}
        actions={
          (data?.providers.length ?? 0) > 0 && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => setLinking(true)}
            >
              <Link2 className='me-2 h-4 w-4' />
              <Trans>Link an account</Trans>
            </Button>
          )
        }
      />
      <Main>
        {error ? (
          <GeneralError error={error} reset={() => void refetch()} />
        ) : isLoading || !data ? (
          <ListSkeleton />
        ) : !data.offered ? (
          <p className='text-muted-foreground'>
            <Trans>This server does not offer other networks.</Trans>
          </p>
        ) : (
          <>
            {mayReserve && (
              <HandleChooser
                domains={data.domains}
                suggestion={
                  parents.length === 0 ? suggestHandle(data.name) : ''
                }
                onReserved={() => void refetch()}
              />
            )}
            {parents.map((handle) => (
              <HandleCard
                key={`${handle.domain}/${handle.name}`}
                handle={handle}
                children={childrenOf(handle)}
                networks={networks}
                accounts={accounts}
                onToggle={(h, network, account) =>
                  void handleToggle(h, network, account)
                }
                onRelease={setReleasing}
                onAddName={setAdding}
                busy={busy}
              />
            ))}
            {accounts.length > 0 && (
              <>
                <h2 className='mt-6 mb-2 text-base font-medium'>
                  <Trans>Accounts</Trans>
                </h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Trans>Address</Trans>
                      </TableHead>
                      <TableHead>
                        <Trans>Name</Trans>
                      </TableHead>
                      <TableHead>
                        <Trans>Network</Trans>
                      </TableHead>
                      <TableHead>
                        <Trans>Kind</Trans>
                      </TableHead>
                      <TableHead>
                        <Trans>Status</Trans>
                      </TableHead>
                      <TableHead className='w-16'></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account) => (
                      <AccountRow
                        key={account.id}
                        account={account}
                        onRename={setRenaming}
                        onKeys={setKeysFor}
                        onPassword={setPasswordFor}
                        onTest={(a) => void handleTest(a)}
                        onProfile={(a) => void handleProfile(a)}
                        onAutomated={(a) => void handleAutomated(a)}
                        onRemove={setRemoving}
                        busy={busy}
                      />
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
            <ModerationSection
              blocks={data.blocks ?? []}
              mutes={data.mutes ?? []}
            />
          </>
        )}
      </Main>

      {linking && data && (
        <LinkDialog
          providers={data.providers}
          onOpenChange={setLinking}
          onLinked={() => void refetch()}
        />
      )}
      {adding && (
        <AddNameDialog
          parent={adding}
          onOpenChange={(open) => {
            if (!open) setAdding(null)
          }}
          onAdded={() => void refetch()}
        />
      )}
      {renaming && (
        <RenameDialog
          account={renaming}
          onOpenChange={(open) => {
            if (!open) setRenaming(null)
          }}
        />
      )}
      {keysFor && (
        <KeysDialog
          account={keysFor}
          onOpenChange={(open) => {
            if (!open) setKeysFor(null)
          }}
        />
      )}
      {passwordFor && (
        <PasswordDialog
          account={passwordFor}
          onOpenChange={(open) => {
            if (!open) setPasswordFor(null)
          }}
        />
      )}
      {releasing && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setReleasing(null)
          }}
          title={t`Release this handle?`}
          desc={t`"${releasing.name}" and the names under it will be freed for anyone to take. Their accounts, everything those published and their followers are removed.`}
          confirmText={t`Release`}
          icon={<Trash2 className='size-4' />}
          destructive
          handleConfirm={async () => {
            const handle = releasing
            setReleasing(null)
            await handleRelease(handle)
          }}
        />
      )}
      {removing && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setRemoving(null)
          }}
          title={
            removing.hosted ? t`Remove this account?` : t`Unlink this account?`
          }
          desc={
            removing.hosted
              ? t`"${removing.identifier}" will be removed with everything it published and its followers.`
              : t`"${removing.identifier}" will be unlinked. What was published through it stays on ${removing.server ?? ''}.`
          }
          confirmText={removing.hosted ? t`Remove` : t`Unlink`}
          icon={<Trash2 className='size-4' />}
          destructive
          handleConfirm={async () => {
            const account = removing
            setRemoving(null)
            await handleRemove(account)
          }}
        />
      )}
    </>
  )
}
