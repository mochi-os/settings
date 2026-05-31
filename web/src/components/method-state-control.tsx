import { useLingui } from '@lingui/react/macro'
import type { MethodState } from '@/types/account'

// Canonical slot order, matching the system settings segmented control so
// the per-user login-methods grid lines up with the operator one.
const SLOT_ORDER: MethodState[] = ['disabled', 'allowed', 'required']

// MethodStateControl is the segmented disabled/allowed/required control used
// by the per-user login-methods grid. `slots` chooses which states this row
// offers (recovery and third-party login omit "required"); `unavailable`
// greys the slots the operator policy or a missing credential forbid, while
// still showing them so the user understands why they can't pick them.
export function MethodStateControl({
  value,
  slots,
  unavailable,
  busy,
  onChange,
}: {
  value: MethodState
  slots: MethodState[]
  unavailable?: Set<MethodState>
  busy?: boolean
  onChange: (next: MethodState) => void
}) {
  const { t } = useLingui()
  const label = (slot: MethodState) =>
    slot === 'disabled' ? t`Disabled` : slot === 'allowed' ? t`Allowed` : t`Required`

  return (
    <div className='inline-flex rounded-md border bg-background p-0.5'>
      {SLOT_ORDER.filter((slot) => slots.includes(slot)).map((slot) => {
        const active = value === slot
        const blocked = unavailable?.has(slot) ?? false
        return (
          <button
            key={slot}
            type='button'
            onClick={() => onChange(slot)}
            disabled={busy || active || blocked}
            className={
              'w-20 py-1 text-xs font-medium rounded-sm transition-colors ' +
              (active
                ? 'bg-primary text-primary-foreground'
                : blocked
                  ? 'text-muted-foreground/40 cursor-not-allowed'
                  : 'text-muted-foreground hover:text-foreground')
            }
          >
            {label(slot)}
          </button>
        )
      })}
    </div>
  )
}
