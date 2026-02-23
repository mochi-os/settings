import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { requestHelpers } from '@mochi/common'
import endpoints from '@/api/endpoints'

interface Interest {
  qid: string
  label: string
  weight: number
  updated: number
}

interface InterestsResponse {
  interests: Interest[]
  summary: string
}

interface SearchResult {
  qid: string
  label: string
  description: string
}

interface SearchResponse {
  results: SearchResult[]
}

export type { Interest, SearchResult }

export function useInterests() {
  return useQuery({
    queryKey: ['interests'],
    queryFn: () =>
      requestHelpers.get<InterestsResponse>(endpoints.user.interests),
  })
}

export function useInterestSet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { qid: string; weight: number }) =>
      requestHelpers.post<{ ok: boolean }>(endpoints.user.interestsSet, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interests'] })
    },
  })
}

export function useInterestRemove() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (qid: string) =>
      requestHelpers.post<{ ok: boolean }>(endpoints.user.interestsRemove, {
        qid,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interests'] })
    },
  })
}

export function useInterestSearch() {
  return useMutation({
    mutationFn: (query: string) =>
      requestHelpers.post<SearchResponse>(endpoints.user.interestsSearch, {
        query,
      }),
  })
}

export function useInterestSummary() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      requestHelpers.post<{ summary: string }>(
        endpoints.user.interestsSummary,
        {}
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interests'] })
    },
  })
}
