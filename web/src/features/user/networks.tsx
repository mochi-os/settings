// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
//
// The Networks page: the user's handles, the hosted account each network makes
// of a handle, and the accounts linked on other servers, all in one place.
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type {
  Block,
  Availability,
  Handle,
  Mute,
  NetworkAccount,
  NetworkFeed,
  NetworkProvider,
} from '@/types/networks'
import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import {
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
  ArrowDownToLine,
  ArrowRightLeft,
  Bot,
  Check,
  Copy,
  Eye,
  EyeOff,
  House,
  KeyRound,
  Link2,
  LogIn,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Share2,
  Tags,
  Trash2,
  UserRoundPlus,
  Zap,
} from 'lucide-react'
import { suggestHandle } from '@/lib/handles'
import { networkLabel } from '@/lib/networks'
import {
  useAccountAliases,
  useAccountCreate,
  useAccountKeys,
  useAccountKeysRecovery,
  useAccountKeysReplace,
  useAccountHome,
  useAccountLabelers,
  useAccountLink,
  useAccountMove,
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
// The hosted account a handle has on a network, if any.
function handleAccount(
  accounts: NetworkAccount[],
  handle: Handle,
  network: string
) {
  return accounts.find(
    (a) =>
      a.hosted &&
      a.type === network &&
      a.identifier === handle.addresses[network]
  )
}

// The networks a handle card has rows for: those the server offers, then any
// a handle still has an account on since the server stopped offering it, so
// that the account stays listed and can be removed.
function handleNetworks(
  networks: string[],
  accounts: NetworkAccount[],
  handles: Handle[]
) {
  const extra = accounts
    .filter(
      (a) =>
        a.hosted &&
        !networks.includes(a.type) &&
        handles.some((h) => h.addresses[a.type] === a.identifier)
    )
    .map((a) => a.type)
  return [...networks, ...new Set(extra)]
}

function HandleCard({
  handle,
  children,
  networks,
  accounts,
  feeds,
  actions,
  onToggle,
  onRelease,
  onAddName,
  onArrive,
  busy,
}: {
  handle: Handle
  children: Handle[]
  networks: string[]
  accounts: NetworkAccount[]
  feeds: NetworkFeed[]
  actions: AccountActions
  onToggle: (
    handle: Handle,
    network: string,
    account: NetworkAccount | undefined
  ) => void
  onRelease: (handle: Handle) => void
  onAddName: (handle: Handle) => void
  onArrive: (handle: Handle) => void
  busy: string | null
}) {
  const { t } = useLingui()
  const { domain } = handle
  const rows = [handle, ...children]
  const hosted = (h: Handle, network: string) =>
    handleAccount(accounts, h, network)
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
            {networks.includes('bluesky') && !hosted(handle, 'bluesky') && (
              <DropdownMenuItem onClick={() => onArrive(handle)}>
                <ArrowDownToLine className='me-2 h-4 w-4' />
                <Trans>Move a Bluesky account here</Trans>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onRelease(handle)}>
              <Trash2 className='me-2 h-4 w-4' />
              <Trans>Release</Trans>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      {rows.map((row) =>
        handleNetworks(networks, accounts, rows).map((type) => {
          const account = hosted(row, type)
          const key = `${row.name}/${type}`
          const { name } = row
          const network = networkLabel(type)
          return (
            <NetworkRow
              key={key}
              label={row === handle ? network : t`${name} on ${network}`}
              address={row.addresses[type]}
              status={account ? accountStatus(account, feeds) : null}
            >
              <Switch
                checked={!!account}
                loading={busy === key}
                aria-label={t`${network} for ${name}`}
                onCheckedChange={() => onToggle(row, type, account)}
              />
              {account ? (
                <AccountMenu account={account} actions={actions} busy={busy} />
              ) : (
                // The menu's width, so the switches line up
                <span aria-hidden='true' className='w-9' />
              )}
            </NetworkRow>
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

// A hosted fediverse account's aliases: the person's accounts elsewhere that
// may move to this one, each named by its handle, which the other server
// checks when the person moves from it (phase 17).
export function AliasesDialog({
  account,
  onOpenChange,
}: {
  account: NetworkAccount
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useLingui()
  const [aliases, setAliases] = useState<string[]>(account.aliases ?? [])
  const [address, setAddress] = useState('')
  const update = useAccountAliases()
  const save = async (next: string[]) => {
    try {
      await update.mutateAsync({ id: account.id, aliases: next })
      setAliases(next)
      setAddress('')
      toast.success(t`Account updated`)
    } catch (error) {
      toast.error(getErrorMessage(error, t`Could not update the account`))
    }
  }
  return (
    <ResponsiveDialog open onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className='sm:max-w-[480px]'>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            <Trans>Aliases</Trans>
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className='space-y-3 py-2'>
          {aliases.map((alias) => (
            <FieldRow key={alias} label={alias} inline>
              <Button
                variant='outline'
                size='sm'
                disabled={update.isPending}
                onClick={() => void save(aliases.filter((a) => a !== alias))}
                aria-label={t`Remove ${alias}`}
              >
                <Trash2 className='size-4' />
              </Button>
            </FieldRow>
          ))}
          <div className='flex items-center gap-2'>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              aria-label={t`Account elsewhere`}
              placeholder='@name@server.example'
              onKeyDown={(e) => {
                if (e.key === 'Enter' && address.trim()) {
                  e.preventDefault()
                  void save([...aliases, address.trim()])
                }
              }}
            />
            <Button
              size='sm'
              disabled={!address.trim() || update.isPending}
              onClick={() => void save([...aliases, address.trim()])}
            >
              {update.isPending ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <Plus className='size-4' />
              )}
              <Trans>Add</Trans>
            </Button>
          </div>
        </div>
        <ResponsiveDialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            <Trans>Close</Trans>
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

// The labellers a hosted Bluesky account reads beside the server's: each a
// labelling service on Bluesky by its identifier, whose labels then hide or
// warn on what the account reads (phase 19).
// Choosing where posts made from other apps signed in to an account land:
// one of the user's public feeds, a new one named after the account, or none
// (decision 42).
export function HomeDialog({
  account,
  feeds,
  onOpenChange,
}: {
  account: NetworkAccount
  feeds: NetworkFeed[]
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useLingui()
  const choices = feeds
    .filter((f) => f.privacy === 'public')
    .sort((a, b) => naturalCompare(a.name, b.name))
  const [choice, setChoice] = useState(
    choices.some((f) => f.id === account.home) ? account.home! : 'none'
  )
  const update = useAccountHome()
  const save = async () => {
    try {
      await update.mutateAsync(
        choice === 'new'
          ? { id: account.id, feed: '', create: 'true' }
          : { id: account.id, feed: choice === 'none' ? '' : choice }
      )
      toast.success(t`Home feed saved`)
      onOpenChange(false)
    } catch (error) {
      toast.error(getErrorMessage(error, t`Could not save the home feed`))
    }
  }
  return (
    <ResponsiveDialog open onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className='sm:max-w-[425px]'>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            <Trans>Home feed</Trans>
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className='py-2'>
          <Select value={choice} onValueChange={setChoice}>
            <SelectTrigger aria-label={t`Home feed`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='none'>
                <Trans context='feed'>None</Trans>
              </SelectItem>
              {choices.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
              <SelectItem value='new'>
                <Trans>A new feed</Trans>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ResponsiveDialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button disabled={update.isPending} onClick={() => void save()}>
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

export function LabelersDialog({
  account,
  onOpenChange,
}: {
  account: NetworkAccount
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useLingui()
  const [labelers, setLabelers] = useState<string[]>(account.labelers ?? [])
  const [identifier, setIdentifier] = useState('')
  const update = useAccountLabelers()
  const save = async (next: string[]) => {
    try {
      await update.mutateAsync({ id: account.id, labelers: next })
      setLabelers(next)
      setIdentifier('')
      toast.success(t`Account updated`)
    } catch (error) {
      toast.error(getErrorMessage(error, t`Could not update the account`))
    }
  }
  return (
    <ResponsiveDialog open onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className='sm:max-w-[480px]'>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            <Trans>Labellers</Trans>
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className='space-y-3 py-2'>
          {labelers.map((labeler) => (
            <FieldRow key={labeler} label={labeler} inline>
              <Button
                variant='outline'
                size='sm'
                disabled={update.isPending}
                onClick={() => void save(labelers.filter((l) => l !== labeler))}
                aria-label={t`Remove ${labeler}`}
              >
                <Trash2 className='size-4' />
              </Button>
            </FieldRow>
          ))}
          <div className='flex items-center gap-2'>
            <Input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              aria-label={t`Labeller`}
              placeholder='did:plc:...'
              onKeyDown={(e) => {
                if (e.key === 'Enter' && identifier.trim()) {
                  e.preventDefault()
                  void save([...labelers, identifier.trim()])
                }
              }}
            />
            <Button
              size='sm'
              disabled={!identifier.trim() || update.isPending}
              onClick={() => void save([...labelers, identifier.trim()])}
            >
              {update.isPending ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <Plus className='size-4' />
              )}
              <Trans>Add</Trans>
            </Button>
          </div>
        </div>
        <ResponsiveDialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            <Trans>Close</Trans>
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

// Moving a hosted fediverse account to an account elsewhere: the followers'
// servers are told and follow the new account instead (phase 17). The other
// account must name this one among its aliases first.
export function MoveDialog({
  account,
  onOpenChange,
}: {
  account: NetworkAccount
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useLingui()
  const [address, setAddress] = useState('')
  const move = useAccountMove()
  const handleMove = async () => {
    try {
      await move.mutateAsync({ id: account.id, address: address.trim() })
      toast.success(t`Account moved`)
      onOpenChange(false)
    } catch (error) {
      toast.error(getErrorMessage(error, t`Could not move the account`))
    }
  }
  return (
    <ResponsiveDialog open onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className='sm:max-w-[480px]'>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            <Trans>Move to another account</Trans>
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className='grid gap-2 py-4'>
          <Label htmlFor='account-move'>
            <Trans>Account to move to</Trans>
          </Label>
          <Input
            id='account-move'
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder='@name@server.example'
          />
          <p className='text-muted-foreground text-sm'>
            <Trans>
              Add {account.identifier} to that account's aliases there first.
              Your followers are told to follow it instead.
            </Trans>
          </p>
        </div>
        <ResponsiveDialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            disabled={move.isPending || !address.trim()}
            onClick={() => void handleMove()}
          >
            {move.isPending ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <ArrowRightLeft className='size-4' />
            )}
            <Trans>Move</Trans>
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

// A hosted account's keys: what it signs with, replaced here, and on Bluesky
// the recovery key the user keeps - offered as soon as the account is made,
// with the dialog opening on the question.
function KeysDialog({
  account,
  offer,
  onOpenChange,
}: {
  account: NetworkAccount
  offer?: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useLingui()
  const { formatTimestamp } = useFormat()
  const keys = useAccountKeys(account.id)
  const replace = useAccountKeysReplace()
  const recovery = useAccountKeysRecovery()
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [confirmRecovery, setConfirmRecovery] = useState(!!offer)
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

// Whether an account has a home feed: a hosted fediverse or Bluesky account
// of a person, which other apps sign in to and post from.
function homed(account: NetworkAccount) {
  return (
    !!account.hosted &&
    account.kind !== 'group' &&
    (account.type === 'fediverse' || account.type === 'bluesky')
  )
}

// Whether a hosted account has keys of its own: a fediverse account signs
// with one, a Bluesky account has its signing and rotation keys. Matrix signs
// per domain and XMPP per device, so theirs have none.
function keyed(account: NetworkAccount) {
  return account.type === 'fediverse' || account.type === 'bluesky'
}

// Why a linked account is not working, in the user's language, and when it
// tries again.
function AccountFailure({ account }: { account: NetworkAccount }) {
  const { t } = useLingui()
  const { formatTime } = useFormat()
  const failure = account.failure
  if (!failure) {
    return <span className='text-destructive'>{account.error}</span>
  }
  const status = String(failure.status ?? '')
  let reason
  switch (failure.reason) {
    case 'unreachable':
      reason = t`The server can't be reached`
      break
    case 'status':
      reason = t`The server answered with error ${status}`
      break
    case 'closed':
      reason = t`The server ended the connection`
      break
    case 'blocked':
      reason = t`Connections to the server are blocked`
      break
    case 'signed_out':
      reason = t`The server no longer accepts this account's sign-in; link it again`
      break
    default:
      reason = t`The connection to the server failed`
  }
  const time = failure.retry ? formatTime(new Date(failure.retry * 1000)) : ''
  return (
    <span className='text-destructive'>
      {reason}
      {time ? (
        <span className='text-muted-foreground block text-xs'>
          {t`Trying again at ${time}`}
        </span>
      ) : null}
    </span>
  )
}

// What an account's row says of it beyond its address, where anything needs
// saying: why a linked account is not working, a move, a home feed gone or
// private, a missing recovery key, a chat account's connection, or the server
// a linked account is on.
function accountStatus(
  account: NetworkAccount,
  feeds: NetworkFeed[]
): ReactNode {
  const chat = account.type === 'xmpp' || account.type === 'matrix'
  const home = account.home
    ? feeds.find((f) => f.id === account.home)
    : undefined
  if (account.failure || account.error) {
    return <AccountFailure account={account} />
  }
  if (account.moved) {
    return <Trans>Moved to {account.moved}</Trans>
  }
  if (account.home && !home) {
    return (
      <span className='text-destructive'>
        <Trans>The home feed has been deleted</Trans>
      </span>
    )
  }
  if (home && home.privacy !== 'public') {
    return (
      <span className='text-destructive'>
        <Trans>The home feed is private</Trans>
      </span>
    )
  }
  if (account.hosted && account.type === 'bluesky' && !account.recovery) {
    return (
      <span className='text-destructive'>
        <Trans>No recovery key</Trans>
      </span>
    )
  }
  if (account.hosted) {
    return null
  }
  if (chat) {
    return account.connected ? (
      <Trans>Connected</Trans>
    ) : (
      <Trans>Not connected</Trans>
    )
  }
  return account.server || null
}

// What can be done with an account, from its row.
interface AccountActions {
  onHome: (account: NetworkAccount) => void
  onRename: (account: NetworkAccount) => void
  onKeys: (account: NetworkAccount) => void
  onPassword: (account: NetworkAccount) => void
  onTest: (account: NetworkAccount) => void
  onProfile: (account: NetworkAccount) => void
  onAutomated: (account: NetworkAccount) => void
  onAliases: (account: NetworkAccount) => void
  onLabelers: (account: NetworkAccount) => void
  onMove: (account: NetworkAccount) => void
  onRemove: (account: NetworkAccount) => void
}

// An account's menu. One a handle card shows is removed by switching it off,
// so its menu has no Remove.
function AccountMenu({
  account,
  actions,
  busy,
  removable = false,
}: {
  account: NetworkAccount
  actions: AccountActions
  busy: string | null
  removable?: boolean
}) {
  const { t } = useLingui()
  return (
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
        <DropdownMenuItem onClick={() => actions.onRename(account)}>
          <Pencil className='me-2 h-4 w-4' />
          <Trans>Profile</Trans>
        </DropdownMenuItem>
        {account.hosted ? (
          <>
            <DropdownMenuItem onClick={() => actions.onPassword(account)}>
              <LogIn className='me-2 h-4 w-4' />
              <Trans>Sign in from another app</Trans>
            </DropdownMenuItem>
            {homed(account) && (
              <DropdownMenuItem onClick={() => actions.onHome(account)}>
                <House className='me-2 h-4 w-4' />
                <Trans>Home feed</Trans>
              </DropdownMenuItem>
            )}
            {keyed(account) && (
              <DropdownMenuItem onClick={() => actions.onKeys(account)}>
                <KeyRound className='me-2 h-4 w-4' />
                <Trans context='cryptographic'>Keys</Trans>
              </DropdownMenuItem>
            )}
            {account.type === 'fediverse' && (
              <>
                <DropdownMenuItem onClick={() => actions.onAutomated(account)}>
                  <Bot className='me-2 h-4 w-4' />
                  {account.automated ? (
                    <Trans>Mark as a person</Trans>
                  ) : (
                    <Trans>Mark as automated</Trans>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => actions.onAliases(account)}>
                  <UserRoundPlus className='me-2 h-4 w-4' />
                  <Trans>Aliases</Trans>
                </DropdownMenuItem>
                {!account.moved && (
                  <DropdownMenuItem onClick={() => actions.onMove(account)}>
                    <ArrowRightLeft className='me-2 h-4 w-4' />
                    <Trans>Move to another account</Trans>
                  </DropdownMenuItem>
                )}
              </>
            )}
            {account.type === 'bluesky' && (
              <DropdownMenuItem onClick={() => actions.onLabelers(account)}>
                <Tags className='me-2 h-4 w-4' />
                <Trans>Labellers</Trans>
              </DropdownMenuItem>
            )}
          </>
        ) : (
          <DropdownMenuItem onClick={() => actions.onTest(account)}>
            <Zap className='me-2 h-4 w-4' />
            <Trans>Test</Trans>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => actions.onProfile(account)}>
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
        {removable && (
          <DropdownMenuItem onClick={() => actions.onRemove(account)}>
            <Trash2 className='me-2 h-4 w-4' />
            <Trans>Remove</Trans>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// A row of a card on this page: what it is, its address and anything to say
// of it, with its controls at the end of the row.
function NetworkRow({
  label,
  address,
  status,
  children,
}: {
  label: string
  address?: string
  status?: ReactNode
  children: ReactNode
}) {
  return (
    <div
      data-slot='network-row'
      className='flex min-h-9 items-center gap-4 py-2'
    >
      <div className='flex min-w-0 flex-1 flex-col'>
        <span className='text-muted-foreground text-sm leading-snug font-medium'>
          {label}
        </span>
        {address && (
          <span className='text-muted-foreground/70 mt-1 text-xs leading-normal break-all'>
            {address}
          </span>
        )}
        {status && (
          <span className='text-muted-foreground mt-1 text-xs'>{status}</span>
        )}
      </div>
      <div className='flex shrink-0 items-center gap-2'>{children}</div>
    </div>
  )
}

// A card of accounts no handle card shows: those linked on other servers, or
// a forum's communities. Each is removed from its menu.
function AccountsCard({
  title,
  action,
  accounts,
  feeds,
  actions,
  busy,
}: {
  title: string
  action?: ReactNode
  accounts: NetworkAccount[]
  feeds: NetworkFeed[]
  actions: AccountActions
  busy: string | null
}) {
  const { t } = useLingui()
  return (
    <Section title={title} className='mb-4' action={action}>
      {accounts.length > 0
        ? accounts.map((account) => {
            const network = networkLabel(account.type)
            const name = account.label || account.name || ''
            return (
              <NetworkRow
                key={account.id}
                label={name ? t`${name} on ${network}` : network}
                address={account.identifier}
                status={accountStatus(account, feeds)}
              >
                <AccountMenu
                  account={account}
                  actions={actions}
                  busy={busy}
                  removable
                />
              </NetworkRow>
            )
          })
        : null}
    </Section>
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
  const [aliasesFor, setAliasesFor] = useState<NetworkAccount | null>(null)
  const [labelersFor, setLabelersFor] = useState<NetworkAccount | null>(null)
  const [homeFor, setHomeFor] = useState<NetworkAccount | null>(null)
  const [movingFor, setMovingFor] = useState<NetworkAccount | null>(null)
  const [keysFor, setKeysFor] = useState<NetworkAccount | null>(null)
  const [offering, setOffering] = useState(false)
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
      const made = await create.mutateAsync({
        network,
        handle: handle.name,
        domain: handle.domain,
      })
      toast.success(t`Account created`)
      // A Bluesky account is offered its recovery key the moment it exists.
      if (network === 'bluesky' && made?.id) {
        setOffering(true)
        setKeysFor(made)
      }
    } catch (err) {
      toast.error(getErrorMessage(err, t`Could not create the account`))
    } finally {
      setBusy(null)
    }
  }

  // A Bluesky account moving here from another server: the account waits
  // for it, and the moving app is given a password minted for it.
  const handleArrive = async (handle: Handle) => {
    const key = `${handle.name}/bluesky`
    setBusy(key)
    try {
      const made = await create.mutateAsync({
        network: 'bluesky',
        handle: handle.name,
        domain: handle.domain,
        arriving: 'true',
      })
      toast.success(t`Ready for the Bluesky account to arrive`)
      if (made?.id) setPasswordFor(made)
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

  const actions: AccountActions = {
    onHome: setHomeFor,
    onRename: setRenaming,
    onKeys: setKeysFor,
    onPassword: setPasswordFor,
    onTest: (a) => void handleTest(a),
    onProfile: (a) => void handleProfile(a),
    onAutomated: (a) => void handleAutomated(a),
    onAliases: setAliasesFor,
    onLabelers: setLabelersFor,
    onMove: setMovingFor,
    onRemove: setRemoving,
  }

  // Each account is listed once: a hosted one in its handle's card, a linked
  // one under Linked accounts, and the rest, a forum's communities, under
  // Communities.
  const carded = new Set(
    parents.flatMap((parent) => {
      const rows = [parent, ...childrenOf(parent)]
      return handleNetworks(networks, accounts, rows).flatMap((type) =>
        rows.map((row) => handleAccount(accounts, row, type)?.id ?? '')
      )
    })
  )
  const linked = accounts.filter((a) => !a.hosted)
  const communities = accounts.filter((a) => a.hosted && !carded.has(a.id))
  const linkable = (data?.providers.length ?? 0) > 0

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
                feeds={data.feeds ?? []}
                actions={actions}
                onToggle={(h, network, account) =>
                  void handleToggle(h, network, account)
                }
                onRelease={setReleasing}
                onAddName={setAdding}
                onArrive={(h) => void handleArrive(h)}
                busy={busy}
              />
            ))}
            {(linkable || linked.length > 0) && (
              <AccountsCard
                title={t`Linked accounts`}
                accounts={linked}
                feeds={data.feeds ?? []}
                actions={actions}
                busy={busy}
                action={
                  linkable && (
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
            )}
            {communities.length > 0 && (
              <AccountsCard
                title={t`Communities`}
                accounts={communities}
                feeds={data.feeds ?? []}
                actions={actions}
                busy={busy}
              />
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
      {aliasesFor && (
        <AliasesDialog
          account={aliasesFor}
          onOpenChange={(open) => {
            if (!open) setAliasesFor(null)
          }}
        />
      )}
      {homeFor && data && (
        <HomeDialog
          account={homeFor}
          feeds={data.feeds ?? []}
          onOpenChange={(open) => {
            if (!open) setHomeFor(null)
          }}
        />
      )}
      {labelersFor && (
        <LabelersDialog
          account={labelersFor}
          onOpenChange={(open) => {
            if (!open) setLabelersFor(null)
          }}
        />
      )}
      {movingFor && (
        <MoveDialog
          account={movingFor}
          onOpenChange={(open) => {
            if (!open) setMovingFor(null)
          }}
        />
      )}
      {keysFor && (
        <KeysDialog
          account={keysFor}
          offer={offering}
          onOpenChange={(open) => {
            if (!open) {
              setKeysFor(null)
              setOffering(false)
            }
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
