import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  Bell,
  Loader2,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  cn,
  EmptyState,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  GeneralError,
  Input,
  Label,
  Main,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
  getErrorMessage,
  requestHelpers,
  toast,
  usePageTitle,
} from '@mochi/web'
import endpoints from '@/api/endpoints'

type TabId = 'categories' | 'apps'

interface DestinationRow {
  type: string
  target: string
}

interface Category {
  id: number
  label: string
  default: number
  created: number
  destinations: DestinationRow[]
}

interface Account {
  id: number
  type: string
  label: string
  identifier?: string
  enabled: number
}

interface Feed {
  id: string
  name: string
  enabled: number
}

interface DestinationsAvailable {
  accounts: Account[]
  feeds: Feed[]
}

interface Subscription {
  id: number
  app: string
  app_name: string
  topic: string
  object: string
  label: string
  category: number | null
  created: number
}

const tabs: { id: TabId; label: string }[] = [
  { id: 'categories', label: 'Categories' },
  { id: 'apps', label: 'Apps' },
]

// Sort categories alphabetically by label, with "No notifications" (id 0) last.
function sortCategories(cats: Category[]): Category[] {
  return [...cats].sort((a, b) => {
    if (a.id === 0) return 1
    if (b.id === 0) return -1
    return a.label.localeCompare(b.label)
  })
}

export function UserNotifications() {
  usePageTitle('Notifications')

  const search = useSearch({ strict: false }) as { tab?: TabId }
  const navigate = useNavigate()
  const activeTab: TabId = search.tab ?? 'categories'
  const setActiveTab = (next: TabId) => {
    void navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, tab: next }), replace: true } as never)
  }
  const [creating, setCreating] = useState(false)

  return (
    <>
      <PageHeader title="Notifications" />
      <Main>
        <div className="mb-4 flex items-center justify-between border-b">
          <div className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                  activeTab === t.id
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          {activeTab === 'categories' && (
            <Button variant="outline" size="sm" onClick={() => setCreating(true)} className="mb-1">
              <Plus className="mr-2 h-4 w-4" /> Add category
            </Button>
          )}
        </div>
        {activeTab === 'categories'
          ? <CategoriesTab creating={creating} setCreating={setCreating} />
          : <AppsTab />}
      </Main>
    </>
  )
}

// ───────────────────────────── Categories tab ─────────────────────────────

function CategoriesTab({
  creating,
  setCreating,
}: {
  creating: boolean
  setCreating: (v: boolean) => void
}) {
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [available, setAvailable] = useState<DestinationsAvailable | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)

  const load = async () => {
    try {
      const [catsRes, destsRes] = await Promise.all([
        requestHelpers.getRaw<{ data: Category[] }>(endpoints.notifications.categories),
        requestHelpers.getRaw<{ data: DestinationsAvailable }>(endpoints.notifications.destinations),
      ])
      setCategories(catsRes?.data ?? [])
      setAvailable(destsRes?.data ?? { accounts: [], feeds: [] })
    } catch (e) {
      setError(e)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  if (error) return <GeneralError error={error} />
  if (!categories || !available) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  const visibleCategories = sortCategories(categories.filter((c) => c.id !== 0))

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="divide-border divide-y">
          {visibleCategories.map((cat) => (
            <CategoryRow
              key={cat.id}
              category={cat}
              available={available}
              onEdit={() => setEditing(cat)}
              onDelete={() => setDeleting(cat)}
              onTest={async () => {
                try {
                  const params = new URLSearchParams({ id: String(cat.id) })
                  const res = await requestHelpers.post<{ sent: number; web: boolean }>(
                    endpoints.notifications.categoriesTest,
                    params.toString(),
                    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
                  )
                  const sent = res?.sent ?? 0
                  if (sent === 0) {
                    toast.error('No destinations configured')
                  } else {
                    toast.success(`Test sent to ${sent} destination${sent === 1 ? '' : 's'}`)
                  }
                } catch (e) {
                  toast.error(getErrorMessage(e, 'Failed to send test'))
                }
              }}
            />
          ))}
        </div>
      </div>
      {creating && (
        <CategoryDialog
          available={available}
          onClose={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false)
            await load()
          }}
        />
      )}
      {editing && (
        <CategoryDialog
          category={editing}
          available={available}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            await load()
          }}
        />
      )}
      {deleting && (
        <CategoryDeleteDialog
          category={deleting}
          categories={categories}
          onClose={() => setDeleting(null)}
          onDeleted={async () => {
            setDeleting(null)
            await load()
          }}
        />
      )}
    </>
  )
}

function CategoryRow({
  category,
  available,
  onEdit,
  onDelete,
  onTest,
}: {
  category: Category
  available: DestinationsAvailable
  onEdit: () => void
  onDelete: () => void
  onTest: () => void
}) {
  const destSummary = useMemo(() => summariseDestinations(category.destinations, available), [category, available])
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium">{category.label}</span>
          {category.default === 1 && (
            <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">Default</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{destSummary}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onTest}>
          <Send className="mr-2 h-4 w-4" /> Test
        </Button>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
        <Button variant="outline" size="sm" onClick={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </Button>
      </div>
    </div>
  )
}

function summariseDestinations(dests: DestinationRow[], avail: DestinationsAvailable): string {
  if (dests.length === 0) return 'No destinations'
  const labels: string[] = []
  for (const d of dests) {
    if (d.type === 'web') labels.push('Mochi web')
    else if (d.type === 'account') {
      const acc = avail.accounts.find((a) => String(a.id) === d.target)
      labels.push(acc ? acc.label || acc.identifier || acc.type : `Account #${d.target}`)
    } else if (d.type === 'rss') {
      const f = avail.feeds.find((x) => x.id === d.target)
      labels.push(f ? f.name : `RSS #${d.target}`)
    }
  }
  return labels.join(', ')
}

function CategoryDialog({
  category,
  available,
  onClose,
  onSaved,
}: {
  category?: Category
  available: DestinationsAvailable
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const isSuppress = category?.id === 0
  const [label, setLabel] = useState(category?.label ?? '')
  const [isDefault, setIsDefault] = useState<boolean>(category?.default === 1)
  const [saving, setSaving] = useState(false)

  const initialChecked = useMemo(() => {
    const set = new Set<string>()
    if (category) {
      for (const d of category.destinations) set.add(destKey(d.type, d.target))
    } else {
      set.add(destKey('web', ''))
      for (const acc of available.accounts) {
        if (acc.enabled) set.add(destKey('account', String(acc.id)))
      }
    }
    return set
  }, [category, available])
  const [checked, setChecked] = useState<Set<string>>(initialChecked)

  const toggle = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSave = async () => {
    if (!label.trim()) {
      toast.error('Label is required')
      return
    }
    setSaving(true)
    try {
      const destinations: DestinationRow[] = []
      if (!isSuppress) {
        for (const key of checked) {
          const [type, target] = key.split(':', 2)
          destinations.push({ type, target: target ?? '' })
        }
      }
      const params = new URLSearchParams()
      params.append('label', label.trim())
      if (!isSuppress) {
        params.append('destinations', JSON.stringify(destinations))
        if (isDefault) params.append('default', '1')
      }
      if (category) {
        params.append('id', String(category.id))
        await requestHelpers.post(endpoints.notifications.categoriesUpdate, params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      } else {
        await requestHelpers.post(endpoints.notifications.categoriesCreate, params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      }
      await onSaved()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to save category'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{category ? 'Edit category' : 'New category'}</DialogTitle>
          <DialogDescription>
            {isSuppress
              ? 'The "No notifications" category silences any subscription assigned to it.'
              : 'Choose the destinations notifications routed to this category should deliver to.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div className="space-y-2">
            <Label htmlFor="cat-label">Name</Label>
            <Input id="cat-label" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          {!isSuppress && (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor="cat-default" className="cursor-pointer">
                  Default category
                </Label>
                <Switch
                  id="cat-default"
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                  disabled={category?.default === 1}
                />
              </div>
              <div className="space-y-2">
                <Label>Destinations</Label>
                <DestinationsGrid
                  available={available}
                  checked={checked}
                  onToggle={toggle}
                />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function destKey(type: string, target: string): string {
  return `${type}:${target}`
}

function DestinationsGrid({
  available,
  checked,
  onToggle,
}: {
  available: DestinationsAvailable
  checked: Set<string>
  onToggle: (key: string) => void
}) {
  const rows: { key: string; label: string }[] = []
  rows.push({ key: destKey('web', ''), label: 'Mochi web' })
  for (const acc of available.accounts) {
    rows.push({
      key: destKey('account', String(acc.id)),
      label: acc.label || acc.identifier || acc.type,
    })
  }
  for (const feed of available.feeds) {
    rows.push({ key: destKey('rss', feed.id), label: `RSS: ${feed.name}` })
  }
  return (
    <div className="flex flex-col">
      {rows.map((r) => (
        <label key={r.key} className="flex items-center gap-3 py-2 cursor-pointer">
          <Switch checked={checked.has(r.key)} onCheckedChange={() => onToggle(r.key)} />
          <span className="text-sm">{r.label}</span>
        </label>
      ))}
    </div>
  )
}

function CategoryDeleteDialog({
  category,
  categories,
  onClose,
  onDeleted,
}: {
  category: Category
  categories: Category[]
  onClose: () => void
  onDeleted: () => void | Promise<void>
}) {
  const others = sortCategories(categories.filter((c) => c.id !== category.id))
  const preferred = others.find((c) => c.default === 1) ?? others.find((c) => c.id !== 0) ?? others[0]
  const [target, setTarget] = useState<string>(String(preferred?.id ?? 0))
  const [deleting, setDeleting] = useState(false)

  const run = async () => {
    setDeleting(true)
    try {
      const params = new URLSearchParams({ id: String(category.id), reassign_to: target })
      await requestHelpers.post(endpoints.notifications.categoriesDelete, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      await onDeleted()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to delete category'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{category.label}"?</AlertDialogTitle>
          <AlertDialogDescription />
        </AlertDialogHeader>
        <div className="flex items-center justify-between gap-3 py-2">
          <Label htmlFor="reassign-target">Change current notifications to</Label>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger id="reassign-target" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {others.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={run} disabled={deleting}>
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ───────────────────────────── Subscriptions tab ─────────────────────────────

function AppsTab() {
  const [subs, setSubs] = useState<Subscription[] | null>(null)
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [error, setError] = useState<unknown>(null)

  const load = async () => {
    try {
      const [subsRes, catsRes] = await Promise.all([
        requestHelpers.getRaw<{ data: Subscription[] }>(endpoints.notifications.subscriptions),
        requestHelpers.getRaw<{ data: Category[] }>(endpoints.notifications.categories),
      ])
      setSubs(subsRes?.data ?? [])
      setCategories(catsRes?.data ?? [])
    } catch (e) {
      setError(e)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const setCategory = async (sub: Subscription, value: string) => {
    try {
      const params = new URLSearchParams({ id: String(sub.id), category: value })
      await requestHelpers.post(endpoints.notifications.subscriptionsSetCategory, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      await load()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to update subscription'))
    }
  }

  const remove = async (sub: Subscription) => {
    try {
      const params = new URLSearchParams({ id: String(sub.id) })
      await requestHelpers.post(endpoints.notifications.subscriptionsDelete, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      await load()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to remove subscription'))
    }
  }

  const groups = useMemo(() => {
    if (!subs) return []
    const map = new Map<string, { app: string; app_name: string; items: Subscription[] }>()
    for (const sub of subs) {
      const g = map.get(sub.app) ?? { app: sub.app, app_name: sub.app_name, items: [] }
      g.items.push(sub)
      map.set(sub.app, g)
    }
    return Array.from(map.values()).sort((a, b) => a.app_name.localeCompare(b.app_name))
  }, [subs])

  if (error) return <GeneralError error={error} />
  if (!subs || !categories) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  if (subs.length === 0) {
    return <EmptyState icon={Bell} title="No notifications configured" />
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.app}>
          <h2 className="text-[1.125rem] leading-tight font-semibold md:text-lg">
            {group.app_name}
          </h2>
          <div className="divide-border divide-y">
            {group.items.map((sub) => (
              <div
                key={sub.id}
                className="flex flex-col gap-3 py-2 pl-6 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-sm">
                  {sub.label}
                  {sub.object ? ` (${sub.object})` : ''}
                </p>
                <div className="flex items-center gap-2">
                  <Select
                    value={sub.category != null ? String(sub.category) : ''}
                    onValueChange={(v) => setCategory(sub, v)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortCategories(categories).map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => remove(sub)} title="Remove (re-prompt on next app open)">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
