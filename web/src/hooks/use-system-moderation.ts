// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type {
  ReportOutcome,
  SystemBlocks,
  SystemHosts,
  SystemReports,
} from '@/types/moderation'
import { requestHelpers } from '@mochi/web'
import endpoints from '@/api/endpoints'
import { fresh } from '@/lib/fresh'

// Each query's options are shared by its hook and the page's loader.
export function systemReportsQuery(state: 'open' | 'resolved') {
  return queryOptions({
    queryKey: ['system', 'reports', state],
    queryFn: () =>
      requestHelpers.get<SystemReports>(
        `${endpoints.system.reportsList}?state=${state}`
      ),
    staleTime: fresh.page,
  })
}

export function useSystemReports(state: 'open' | 'resolved') {
  return useQuery(systemReportsQuery(state))
}

// Resolving a report moves it from the open list to the resolved one, and a
// block or a suspension changes those pages too.
export function useSystemReportResolve() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      id: string
      outcome: ReportOutcome
      target?: string
      token?: string
    }) =>
      requestHelpers.post(endpoints.system.reportsResolve, data, {
        mochi: { showGlobalErrorToast: false },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['system', 'reports'] })
      void queryClient.invalidateQueries({ queryKey: ['system', 'blocks'] })
      void queryClient.invalidateQueries({ queryKey: ['system-users'] })
    },
  })
}

export function systemBlocksQuery() {
  return queryOptions({
    queryKey: ['system', 'blocks'],
    queryFn: () =>
      requestHelpers.get<SystemBlocks>(endpoints.system.blocksList),
    staleTime: fresh.page,
  })
}

export function useSystemBlocks() {
  return useQuery(systemBlocksQuery())
}

export function useSystemBlockChange(action: 'add' | 'remove') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (target: string) =>
      requestHelpers.post<SystemBlocks>(
        action === 'add'
          ? endpoints.system.blocksAdd
          : endpoints.system.blocksRemove,
        { target },
        { mochi: { showGlobalErrorToast: false } }
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(['system', 'blocks'], data)
    },
  })
}

export function systemHostsQuery() {
  return queryOptions({
    queryKey: ['system', 'hosts'],
    queryFn: () => requestHelpers.get<SystemHosts>(endpoints.system.hosts),
    staleTime: fresh.page,
  })
}

export function useSystemHosts() {
  return useQuery({ ...systemHostsQuery(), refetchInterval: 10000 })
}
