import { useState, useRef } from 'react'
import { Loader2, Search, Star, Trash2, RefreshCw } from 'lucide-react'
import {
  useInterests,
  useInterestSet,
  useInterestRemove,
  useInterestSearch,
  useInterestSummary,
} from '@/hooks/use-interests'
import type { Interest, SearchResult } from '@/hooks/use-interests'
import {
  Button,
  EmptyState,
  GeneralError,
  Input,
  ListSkeleton,
  Main,
  PageHeader,
  Slider,
  usePageTitle,
  getErrorMessage,
  toast,
} from '@mochi/common'

function InterestRow({ interest }: { interest: Interest }) {
  const setInterest = useInterestSet()
  const removeInterest = useInterestRemove()
  const [weight, setWeight] = useState(interest.weight)

  const handleWeightCommit = (w: number) => {
    setWeight(w)
    setInterest.mutate(
      { qid: interest.qid, weight: w },
      {
        onError: (error) => {
          setWeight(interest.weight)
          toast.error(getErrorMessage(error, 'Failed to update interest'))
        },
      }
    )
  }

  const handleRemove = () => {
    removeInterest.mutate(interest.qid, {
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to remove interest'))
      },
    })
  }

  return (
    <div className='flex items-center gap-4 py-2.5'>
      <div className='min-w-0 flex-1'>
        <span className='text-sm font-medium'>{interest.label}</span>
      </div>
      <Slider
        min={0}
        max={100}
        step={1}
        value={weight}
        onChange={(e) => setWeight(Number(e.target.value))}
        onMouseUp={(e) =>
          handleWeightCommit(Number((e.target as HTMLInputElement).value))
        }
        onTouchEnd={(e) =>
          handleWeightCommit(Number((e.target as HTMLInputElement).value))
        }
        className='w-64 shrink-0'
      />
      <span className='text-muted-foreground w-8 shrink-0 text-right text-xs tabular-nums'>
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
    <div className='border-border bg-popover absolute top-full right-0 left-0 z-10 mt-1 overflow-hidden rounded-[10px] border shadow-md'>
      {results.map((result) => (
        <button
          key={result.qid}
          type='button'
          className='hover:bg-accent w-full px-3 py-2 text-left'
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
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const search = useInterestSearch()
  const setInterest = useInterestSet()
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
          toast.error(getErrorMessage(error, 'Search failed'))
        },
      })
    }, 300)
  }

  const handleSelect = (result: SearchResult) => {
    setInterest.mutate(
      { qid: result.qid, weight: 50 },
      {
        onSuccess: () => {
          toast.success(`Added "${result.label}"`)
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, 'Failed to add interest'))
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
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder='Search topics to add...'
          className='pl-9'
        />
      </div>
      {showResults && (
        <SearchResults results={results} onSelect={handleSelect} />
      )}
    </div>
  )
}

export function UserInterests() {
  usePageTitle('Interests')
  const { data, isLoading, error, refetch } = useInterests()
  const regenerateSummary = useInterestSummary()

  const interests = [...(data?.interests ?? [])].sort((a, b) => a.label.localeCompare(b.label))
  const summary = data?.summary ?? ''

  const handleRegenerate = () => {
    regenerateSummary.mutate(undefined, {
      onSuccess: () => {
        toast.success('Summary regenerated')
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to regenerate summary'))
      },
    })
  }

  return (
    <>
      <PageHeader
        title='Interests'
        icon={<Star className='size-4 md:size-5' />}
      />

      <Main className='space-y-4'>
        {summary && (
          <div className='space-y-1.5'>
            <div className='flex items-center gap-2'>
              <h4 className='text-sm font-medium'>Summary</h4>
              <Button
                variant='ghost'
                size='sm'
                className='size-7 p-0'
                onClick={handleRegenerate}
                disabled={regenerateSummary.isPending}
              >
                {regenerateSummary.isPending ? (
                  <Loader2 className='size-3.5 animate-spin' />
                ) : (
                  <RefreshCw className='size-3.5' />
                )}
              </Button>
            </div>
            <p className='text-muted-foreground text-sm'>{summary}</p>
          </div>
        )}

        <InterestSearch />

        {error ? (
          <GeneralError
            error={error}
            minimal
            mode='inline'
            reset={refetch}
          />
        ) : isLoading ? (
          <ListSkeleton variant='simple' height='h-10' count={5} />
        ) : interests.length === 0 ? (
          <EmptyState
            icon={Star}
            title='No interests yet'
            description='Search for topics above to personalise your feed rankings.'
            className='py-8'
          />
        ) : (
          <div className='divide-border divide-y'>
            {interests.map((interest) => (
              <InterestRow key={interest.qid} interest={interest} />
            ))}
          </div>
        )}
      </Main>
    </>
  )
}
