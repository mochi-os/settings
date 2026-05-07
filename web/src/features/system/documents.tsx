import { useEffect, useMemo, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { i18n } from '@lingui/core'
import { useNavigate } from '@tanstack/react-router'
import { FileText, Loader2, RotateCcw } from 'lucide-react'
import {
  Badge,
  Button,
  GeneralError,
  ListSkeleton,
  Main,
  PageHeader,
  Section,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  formatSystemTimestamp,
  getErrorMessage,
  toast,
  usePageTitle,
} from '@mochi/web'
import {
  useSystemDocumentsData,
  useSetSystemDocument,
  type SystemDocument,
} from '@/hooks/use-system-documents'
import { Route } from '@/routes/_authenticated/system/documents'

type DocumentName = 'rules' | 'terms' | 'privacy'

const DOCUMENT_NAMES: DocumentName[] = ['rules', 'terms', 'privacy']

function useDocumentLabels(): Record<DocumentName, string> {
  const { t } = useLingui()
  return {
    rules: t`Server rules`,
    terms: t`Terms and conditions`,
    privacy: t`Privacy`,
  }
}

// Render a BCP 47 tag as its native display name (Français, 日本語, …) using
// Intl.DisplayNames in the tag's own locale, with a few explicit overrides
// to disambiguate where the OS-supplied name is unhelpful. Mirrors the
// language-preference picker for consistency.
/* eslint-disable lingui/no-unlocalized-strings -- language names display in their native form */
const LANGUAGE_OVERRIDES: Record<string, string> = {
  en: 'English (international)',
  'en-us': 'English (USA)',
  es: 'Español (España)',
  'es-419': 'Español (latinoamericano)',
}
/* eslint-enable lingui/no-unlocalized-strings */

function languageName(tag: string): string {
  const override = LANGUAGE_OVERRIDES[tag.toLowerCase()]
  if (override) return override
  try {
    const name = new Intl.DisplayNames([tag], { type: 'language' }).of(tag)
    if (name) return name.charAt(0).toLocaleUpperCase() + name.slice(1)
  } catch {
    /* fall through to raw tag */
  }
  return tag
}

// Latin-script first, non-Latin second; within each bucket sort by display name.
function languageBucket(name: string): number {
  for (const ch of name) {
    if (/\p{L}/u.test(ch)) {
      return /[A-Za-zÀ-ÿĀ-ſƀ-ɏ]/.test(ch) ? 0 : 1
    }
  }
  return 0
}

function sortedLanguages(tags: string[]): string[] {
  return [...tags]
    .map((tag) => ({ tag, name: languageName(tag) }))
    .sort((a, b) => {
      const ba = languageBucket(a.name)
      const bb = languageBucket(b.name)
      if (ba !== bb) return ba - bb
      return a.name.localeCompare(b.name)
    })
    .map(({ tag }) => tag)
}

function DocumentEditor({
  document,
  onSave,
  isSaving,
}: {
  document: SystemDocument
  onSave: (body: string) => void
  isSaving: boolean
}) {
  const [body, setBody] = useState(document.body)

  // Reset local body whenever the upstream document (name/language) changes,
  // including after a successful save which refetches and produces a new row.
  useEffect(() => {
    setBody(document.body)
  }, [document.name, document.language, document.body])

  const customised = document.body !== document.default
  const dirty = body !== document.body

  const handleSave = () => onSave(body)
  const handleRevert = () => setBody(document.default)

  return (
    <div className='space-y-3'>
      <div className='flex items-center gap-2 text-sm text-muted-foreground'>
        {customised ? (
          <Badge variant='secondary'><Trans>Customised</Trans></Badge>
        ) : (
          <Badge variant='outline'><Trans>Using bundled default</Trans></Badge>
        )}
        {document.updated > 0 && (
          <span>
            <Trans>Last edited {formatSystemTimestamp(document.updated)}</Trans>
          </span>
        )}
      </div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={24}
        className='font-mono text-sm'
        spellCheck={false}
      />
      <div className='flex items-center justify-end gap-2'>
        {body !== document.default && (
          <Button variant='outline' size='sm' onClick={handleRevert} disabled={isSaving}>
            <RotateCcw className='me-2 h-4 w-4' />
            <Trans>Revert to default</Trans>
          </Button>
        )}
        <Button size='sm' onClick={handleSave} disabled={isSaving || !dirty}>
          {isSaving ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Trans>Save</Trans>
          )}
        </Button>
      </div>
    </div>
  )
}

export function SystemDocuments() {
  const { t } = useLingui()
  usePageTitle(t`Documents`)
  const labels = useDocumentLabels()
  const { data, isLoading, error, refetch } = useSystemDocumentsData()
  const setDocument = useSetSystemDocument()
  const navigate = useNavigate()
  const search = Route.useSearch()
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const tab: DocumentName = search.tab ?? 'rules'
  const documents = data?.documents ?? []

  const languagesByName = useMemo(() => {
    const out: Record<DocumentName, string[]> = { rules: [], terms: [], privacy: [] }
    for (const d of documents) {
      if (d.name === 'rules' || d.name === 'terms' || d.name === 'privacy') {
        out[d.name].push(d.language)
      }
    }
    return {
      rules: sortedLanguages(out.rules),
      terms: sortedLanguages(out.terms),
      privacy: sortedLanguages(out.privacy),
    }
  }, [documents])

  const fallbackLanguage = i18n.locale?.split('-')[0]?.toLowerCase() ?? 'en'
  const language: string =
    search.language ??
    (languagesByName[tab].includes(fallbackLanguage) ? fallbackLanguage : 'en')

  const current = documents.find((d) => d.name === tab && d.language === language)

  const setTab = (next: DocumentName) => {
    void navigate({
      to: '/system/documents',
      search: { tab: next, language: search.language },
      replace: true,
    })
  }

  const setLanguage = (next: string) => {
    void navigate({
      to: '/system/documents',
      search: { tab, language: next },
      replace: true,
    })
  }

  const handleSave = (body: string) => {
    if (!current) return
    const key = `${current.name}/${current.language}`
    setSavingKey(key)
    setDocument.mutate(
      { name: current.name, language: current.language, body },
      {
        onSuccess: () => {
          toast.success(t`Document saved`)
          setSavingKey(null)
        },
        onError: (err) => {
          toast.error(getErrorMessage(err, t`Failed to save document`))
          setSavingKey(null)
        },
      }
    )
  }

  return (
    <>
      <PageHeader title={t`Documents`} icon={<FileText className='size-4 md:size-5' />} />
      <Main className='space-y-6'>
        {error ? (
          <GeneralError error={error} minimal mode='inline' reset={refetch} />
        ) : isLoading ? (
          <ListSkeleton variant='simple' height='h-12' count={4} />
        ) : (
          <Section
            title={t`Server rules, terms and conditions, and privacy notice shown to your users`}
          >
            <Tabs value={tab} onValueChange={(v) => setTab(v as DocumentName)}>
              <TabsList className='grid w-full grid-cols-3'>
                {DOCUMENT_NAMES.map((name) => (
                  <TabsTrigger key={name} value={name}>
                    {labels[name]}
                  </TabsTrigger>
                ))}
              </TabsList>
              {DOCUMENT_NAMES.map((name) => (
                <TabsContent key={name} value={name} className='space-y-4 pt-4'>
                  <div className='flex items-center gap-3'>
                    <span className='text-sm text-muted-foreground'>
                      <Trans>Language</Trans>
                    </span>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className='w-72'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languagesByName[name].map((lang) => (
                          <SelectItem key={lang} value={lang}>
                            {languageName(lang)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {current && current.name === name ? (
                    <DocumentEditor
                      document={current}
                      onSave={handleSave}
                      isSaving={savingKey === `${current.name}/${current.language}`}
                    />
                  ) : (
                    <p className='text-sm text-muted-foreground'>
                      <Trans>No document available for this language.</Trans>
                    </p>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </Section>
        )}
      </Main>
    </>
  )
}
