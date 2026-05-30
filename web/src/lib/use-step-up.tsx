import { useRef, useState, type ReactNode } from 'react'
import { useLingui } from '@lingui/react/macro'
import { StepUpDialog } from '@mochi/web'
import { stepUpClient } from './step-up-client'

// useStepUp wraps a sensitive account-security mutation in step-up
// re-authentication. Call `request(run)` from a trigger (button onClick,
// switch onCheckedChange, ...) to open the dialog; `run(token)` fires once
// the user re-verifies their login factor(s). Render `dialog` once in the
// component.
export function useStepUp(): {
  request: (run: (token: string) => void) => void
  dialog: ReactNode
} {
  const { t } = useLingui()
  const [open, setOpen] = useState(false)
  const run = useRef<((token: string) => void) | null>(null)

  const request = (fn: (token: string) => void) => {
    run.current = fn
    setOpen(true)
  }

  const dialog = (
    <StepUpDialog
      open={open}
      onOpenChange={setOpen}
      title={t`Confirm it's you`}
      description={t`This is a security change to your account. Verify it's you to continue.`}
      client={stepUpClient}
      onVerified={(token) => {
        setOpen(false)
        const fn = run.current
        run.current = null
        fn?.(token)
      }}
    />
  )

  return { request, dialog }
}
