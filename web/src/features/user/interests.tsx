// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { useState, useRef, useCallback, useEffect } from 'react'
import { useLingui } from '@lingui/react/macro'
import {
  Button,
  EmptyState,
  GeneralError,
  Input,
  ListSkeleton,
  Main,
  PageHeader,
  Section,
  Slider,
  usePageTitle,
  getErrorMessage,
  toast,
  naturalCompare,
  interestColor,
} from '@mochi/web'
import { Loader2, Search, Star, Trash2, RefreshCw } from 'lucide-react'
import {
  useInterests,
  useInterestSet,
  useInterestRemove,
  useInterestSearch,
  useInterestSummary,
  type Interest,
  type SearchResult,
} from '@/hooks/use-interests'

function InterestRow({ interest }: { interest: Interest }) {
  const { t } = useLingui()
  const setInterest = useInterestSet()
  const removeInterest = useInterestRemove()
  const [weight, setWeight] = useState(interest.weight)
  const lastSign = useRef(Math.sign(weight) || 1)

  // The weight after snapping. Radix commits the raw step value on a key
  // press, so the commit reads this rather than its own argument.
  const shown = useRef(weight)

  const handleChange = useCallback(([raw]: number[]) => {
    const sign = Math.sign(raw)
    // Snap to 0 when crossing from one side to the other
    if (sign !== 0 && sign !== lastSign.current && Math.abs(raw) <= 8) {
      shown.current = 0
      setWeight(0)
      // Don't update lastSign — keep it on the old side so dragging further through updates it
    } else {
      if (sign !== 0) lastSign.current = sign
      shown.current = raw
      setWeight(raw)
    }
  }, [])

  // The last weight sent, so a commit that repeats it sends nothing.
  const committed = useRef(interest.weight)

  const handleWeightCommit = (w: number) => {
    setWeight(w)
    if (w === committed.current) return
    const previous = committed.current
    committed.current = w
    setInterest.mutate(
      { qid: interest.qid, weight: w },
      {
        onError: (error) => {
          committed.current = previous
          setWeight(interest.weight)
          toast.error(getErrorMessage(error, t`Failed to update interest`))
        },
      }
    )
  }

  const handleRemove = () => {
    removeInterest.mutate(interest.qid, {
      onError: (error) => {
        toast.error(getErrorMessage(error, t`Failed to remove interest`))
      },
    })
  }

  return (
    <div className='flex items-center gap-4 py-2.5'>
      <div className='min-w-0 flex-1'>
        <a
          href={`https://www.wikidata.org/wiki/Special:GoToLinkedPage/enwiki/${interest.qid}`}
          target='_blank'
          rel='noopener noreferrer'
          className='text-sm font-medium hover:underline'
        >
          {interest.label}
        </a>
      </div>
      <div className='relative w-64 shrink-0 pb-2'>
        <Slider
          min={-100}
          max={100}
          step={1}
          aria-label={interest.label}
          value={[weight]}
          onValueChange={handleChange}
          // Fires on pointer release and on every key step.
          onValueCommit={() => handleWeightCommit(shown.current)}
          className='w-full'
          style={{ '--primary': interestColor(weight) } as React.CSSProperties}
        />
        <div className='bg-muted-foreground/50 pointer-events-none absolute top-full left-1/2 h-2 w-px -translate-x-1/2' />
      </div>
      <span
        className='w-8 shrink-0 text-end text-xs tabular-nums'
        style={{ color: interestColor(weight) }}
      >
        {weight > 0 ? '+' : ''}
        {weight}
      </span>
      <Button
        variant='ghost'
        size='sm'
        className='shrink-0'
        onClick={handleRemove}
        disabled={removeInterest.isPending}
      >
        {removeInterest.isPending ? (
          <Loader2 className='size-4 animate-spin' />
        ) : (
          <Trash2 className='size-4' />
        )}
      </Button>
    </div>
  )
}

function SearchResults({
  results,
  onSelect,
}: {
  results: SearchResult[]
  onSelect: (result: SearchResult) => void
}) {
  if (results.length === 0) return null

  return (
    <div className='border-border bg-popover absolute top-full right-0 left-0 z-10 mt-1 overflow-hidden rounded-lg border shadow-md'>
      {results.map((result) => (
        <button
          key={result.qid}
          type='button'
          className='hover:bg-hover w-full px-3 py-2 text-start'
          onClick={() => onSelect(result)}
        >
          <div className='text-sm font-medium'>{result.label}</div>
          {result.description && (
            <div className='text-muted-foreground text-xs'>
              {result.description}
            </div>
          )}
        </button>
      ))}
    </div>
  )
}

function InterestSearch() {
  const { t } = useLingui()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const search = useInterestSearch()
  const setInterest = useInterestSet()
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    }
  }, [])

  const handleSearch = (value: string) => {
    setQuery(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (value.trim().length < 2) {
      setResults([])
      setShowResults(false)
      return
    }
    timerRef.current = setTimeout(() => {
      search.mutate(value.trim(), {
        onSuccess: (data) => {
          setResults(data.results)
          setShowResults(true)
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, t`Search failed`))
        },
      })
    }, 300)
  }

  const handleSelect = (result: SearchResult) => {
    setInterest.mutate(
      { qid: result.qid, weight: 50 },
      {
        onSuccess: () => {
          toast.success(t`Added "${result.label}"`)
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, t`Failed to add interest`))
        },
      }
    )
    setQuery('')
    setResults([])
    setShowResults(false)
    inputRef.current?.focus()
  }

  return (
    <div className='relative'>
      <div className='relative'>
        <Search className='text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2' />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onBlur={() => {
            if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
            blurTimerRef.current = setTimeout(() => setShowResults(false), 200)
          }}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder={t`Search topics to add...`}
          className='ps-9'
        />
      </div>
      {showResults && (
        <SearchResults results={results} onSelect={handleSelect} />
      )}
    </div>
  )
}

export function UserInterests() {
  const { t } = useLingui()
  usePageTitle(t`Interests`)
  const { data, isLoading, error, refetch } = useInterests()
  const regenerateSummary = useInterestSummary()

  const interests = [...(data?.interests ?? [])].sort((a, b) =>
    naturalCompare(a.label, b.label)
  )
  const summary = data?.summary ?? ''

  const handleRegenerate = () => {
    regenerateSummary.mutate(undefined, {
      onSuccess: () => {
        toast.success(t`Summary regenerated`)
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, t`Failed to regenerate summary`))
      },
    })
  }

  return (
    <>
      <PageHeader
        title={t`Interests`}
        icon={<Star className='size-4 md:size-5' />}
      />

      <Main className='space-y-8'>
        {summary && (
          <Section
            title={t`Summary`}
            action={
              <Button
                variant='ghost'
                size='sm'
                className='size-8 p-0'
                onClick={handleRegenerate}
                disabled={regenerateSummary.isPending}
                title={t`Regenerate summary`}
                aria-label={t`Regenerate summary`}
              >
                {regenerateSummary.isPending ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : (
                  <RefreshCw className='size-4' />
                )}
              </Button>
            }
          >
            <p className='text-muted-foreground py-2 text-sm'>{summary}</p>
          </Section>
        )}

        <Section title={t`Interests`} contentClassName='space-y-2 pt-4'>
          <InterestSearch />

          {error ? (
            <GeneralError error={error} minimal mode='inline' reset={refetch} />
          ) : isLoading ? (
            <ListSkeleton variant='simple' height='h-10' count={5} />
          ) : interests.length === 0 ? (
            <EmptyState
              icon={Star}
              title={t`No interests yet`}
              className='p-4'
            />
          ) : (
            <div className='divide-border divide-y'>
              {interests.map((interest) => (
                <InterestRow key={interest.qid} interest={interest} />
              ))}
            </div>
          )}
        </Section>
      </Main>
    </>
  )
}
