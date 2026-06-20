// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useQueryWithError, requestHelpers } from '@mochi/web'
import type { User, SessionsData } from '@/types/users'
import endpoints from '@/api/endpoints'
import {
  type SystemUsersResponse,
  systemUsersApi,
} from '@/api/system-users'
const NO_GLOBAL_ERROR_TOAST_CONFIG = {
  mochi: { showGlobalErrorToast: false },
} as const

export const systemUserKeys = {
  all: () => ['system-users'] as const,
  list: (limit: number, offset: number, search: string, sort: string, order: string) =>
    [...systemUserKeys.all(), 'list', limit, offset, search, sort, order] as const,
  sessions: (uid: string) =>
    [...systemUserKeys.all(), 'sessions', uid] as const,
}

export function useSystemUsersData(
  limit: number,
  offset: number,
  search: string,
  sort: string,
  order: string
) {
  return useQueryWithError<SystemUsersResponse, Error>({
    queryKey: systemUserKeys.list(limit, offset, search, sort, order),
    queryFn: () => systemUsersApi.list(limit, offset, search, sort, order),
  })
}

export const useCreateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { username: string; role: string }) =>
      requestHelpers.post<User>(
        endpoints.system.usersCreate,
        data,
        NO_GLOBAL_ERROR_TOAST_CONFIG
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemUserKeys.all() })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      uid: string
      username?: string
      role?: string
    }) =>
      requestHelpers.post(
        endpoints.system.usersUpdate,
        data,
        NO_GLOBAL_ERROR_TOAST_CONFIG
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemUserKeys.all() })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (uid: string) =>
      requestHelpers.post(
        endpoints.system.usersDelete,
        { uid },
        NO_GLOBAL_ERROR_TOAST_CONFIG
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemUserKeys.all() })
    },
  })
}

export function useSuspendUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (uid: string) =>
      requestHelpers.post(
        endpoints.system.usersSuspend,
        { uid },
        NO_GLOBAL_ERROR_TOAST_CONFIG
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemUserKeys.all() })
    },
  })
}

export function useActivateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (uid: string) =>
      requestHelpers.post(
        endpoints.system.usersActivate,
        { uid },
        NO_GLOBAL_ERROR_TOAST_CONFIG
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemUserKeys.all() })
    },
  })
}

export function useUserSessions(uid: string, enabled: boolean) {
  return useQueryWithError<SessionsData, Error>({
    queryKey: systemUserKeys.sessions(uid),
    queryFn: () => systemUsersApi.getSessions(uid),
    enabled: enabled && !!uid,
  })
}

export function useRevokeUserSessions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { uid: string; session_id?: string }) =>
      requestHelpers.post<{ ok: boolean; revoked: number }>(
        endpoints.system.usersSessionsRevoke,
        data,
        NO_GLOBAL_ERROR_TOAST_CONFIG
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: systemUserKeys.sessions(variables.uid),
      })
    },
  })
}
