// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { useRef, useState, type ReactNode } from 'react'
import { useLingui } from '@lingui/react/macro'
import { StepUpDialog } from '@mochi/web'
import { stepUpClient } from './step-up-client'

// Wrap a sensitive mutation in step-up re-authentication: `request(run)` opens
// the dialog and `run(token)` fires once verified. Render `dialog` once.
export function useStepUp(): {
  request: (run: (token: string) => void, cancel?: () => void) => void
  dialog: ReactNode
} {
  const { t } = useLingui()
  const [open, setOpen] = useState(false)
  const run = useRef<((token: string) => void) | null>(null)
  const cancel = useRef<(() => void) | null>(null)

  // cancel fires when the dialog is dismissed without a proof, so a caller
  // holding a promise or an optimistic value can settle it.
  const request = (fn: (token: string) => void, onCancel?: () => void) => {
    run.current = fn
    cancel.current = onCancel ?? null
    setOpen(true)
  }

  const dialog = (
    <StepUpDialog
      open={open}
      onOpenChange={(next) => {
        // Drop the pending action on dismiss: the OAuth factor polls for up to
        // two minutes, and a late ceremony would otherwise fire whatever
        // run.current holds by then.
        if (!next) {
          run.current = null
          const fn = cancel.current
          cancel.current = null
          fn?.()
        }
        setOpen(next)
      }}
      title={t`Confirm it's you`}
      description={t`This is a security change to your account. Verify it's you to continue.`}
      client={stepUpClient}
      onVerified={(token) => {
        setOpen(false)
        cancel.current = null
        const fn = run.current
        run.current = null
        fn?.(token)
      }}
    />
  )

  return { request, dialog }
}
