// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useEffect, useMemo, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { i18n } from '@lingui/core'
import { useNavigate } from '@tanstack/react-router'
import { Check, FileText, Loader2, RotateCcw } from 'lucide-react'
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
  describeLanguages,
  formatSystemTimestamp,
  getErrorMessage,
  nativeName,
  toast,
  usePageTitle,
} from '@mochi/web'
import {
  useSystemDocumentsData,
  useSystemDocument,
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

// Native names and Latin-first ordering come from lib/web's language picker:
// Intl.DisplayNames lacks data for many installed locales and silently answers
// with the English exonym.
function languageName(tag: string): string {
  return nativeName(tag)
}

function sortedLanguages(tags: string[]): string[] {
  return describeLanguages(tags).map(({ tag }) => tag)
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
          {isSaving ? <Loader2 className='size-4 animate-spin' /> : <Check className='size-4' />}
          <Trans>Save</Trans>
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

  // The index says which pairs exist; the body of the one on screen is its own
  // query, so switching tab or language fetches ~7 KB rather than re-reading
  // every document in every language.
  const { data: current, isLoading: currentLoading } = useSystemDocument(tab, language)

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
                  {currentLoading ? (
                    <ListSkeleton variant='simple' height='h-12' count={3} />
                  ) : current && current.name === name ? (
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
