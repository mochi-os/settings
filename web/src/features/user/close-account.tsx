// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useState } from 'react'
import { useLingui, Trans } from '@lingui/react/macro'
import { LogIn, UserX } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Section,
  getErrorMessage,
  shellNavigateTop,
  toast,
  useFormat,
} from '@mochi/web'
import { useCloseAccount } from '@/hooks/use-account'
import { useStepUp } from '@/lib/use-step-up'

// Closing revokes every session, so the shell loses auth: bounce to the
// top-level URL, where the user lands on login and the reactivation
// interstitial.
function goToLogin() {
  shellNavigateTop('/')
}

export function CloseAccountSection() {
  const { t } = useLingui()
  const { formatDate } = useFormat()
  const closeAccount = useCloseAccount()
  const stepUp = useStepUp()
  const [purgeAt, setPurgeAt] = useState<number | null>(null)
  const purgeDate = purgeAt !== null ? formatDate(new Date(purgeAt * 1000)) : ''

  // Confirmed in the dialog, then step-up verified: mark the account for
  // deletion. Show the result dialog rather than a toast, because the
  // immediate sign-out would destroy a toast before it could be read.
  const runClose = (token: string) => {
    closeAccount.mutate(
      { token },
      {
        onSuccess: ({ purge }) => {
          setPurgeAt(purge)
        },
        onError: (err) => {
          toast.error(getErrorMessage(err, t`Could not close your account`))
        },
      }
    )
  }

  return (
    <>
      <Section
        title={t`Close account`}
        action={
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant='outline' size='sm'>
                <UserX className='me-2 h-4 w-4' />
                <Trans>Close account</Trans>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  <Trans>Close your account?</Trans>
                </AlertDialogTitle>
                <AlertDialogDescription>
                  <Trans>
                    Your account will be scheduled for deletion and you'll be signed out. You can cancel any time before the deletion date by logging back in. Download your data first if you want to keep a copy.
                  </Trans>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  <Trans>Cancel</Trans>
                </AlertDialogCancel>
                <AlertDialogAction
                  variant='destructive'
                  onClick={() => stepUp.request(runClose)}
                >
                  <UserX className='me-2 h-4 w-4' />
                  <Trans>Close account</Trans>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        }
      />
      {stepUp.dialog}

      {/* Result: closing revoked all sessions, so signing out is unavoidable.
          Explain it (and how to undo) at the user's pace, then redirect. */}
      <AlertDialog open={purgeAt !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans>Account scheduled for deletion</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Trans>Your account will be permanently deleted on {purgeDate}. You've been signed out. To cancel, sign in again before then.</Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={goToLogin}>
              <LogIn className='me-2 h-4 w-4' />
              <Trans>Go to login</Trans>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
