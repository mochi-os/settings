// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { createFileRoute } from '@tanstack/react-router'
import {
  authMethodsQuery,
  methodsQuery,
  oauthQuery,
  passkeysQuery,
  recoveryQuery,
  totpQuery,
} from '@/hooks/use-account'
import { UserLogin } from '@/features/user/login'

export const Route = createFileRoute('/_authenticated/user/login')({
  // The page's data, asked for beside the route's code rather than once the
  // page has mounted. Not awaited: the page's hooks join them.
  loader: ({ context }) => {
    const { queryClient } = context
    void queryClient.prefetchQuery(methodsQuery())
    void queryClient.prefetchQuery(passkeysQuery())
    void queryClient.prefetchQuery(totpQuery())
    void queryClient.prefetchQuery(oauthQuery())
    void queryClient.prefetchQuery(authMethodsQuery())
    void queryClient.prefetchQuery(recoveryQuery())
  },
  component: UserLogin,
})
