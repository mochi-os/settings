// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { MethodState } from '@/types/account'
import { useMethodStateLabel } from '@/hooks/use-method-state-label'

// Canonical slot order, so the per-user login-methods grid lines up with the
// operator's rows in system settings.
const SLOT_ORDER: MethodState[] = ['disabled', 'allowed', 'required']

// Segmented disabled/allowed/required control, for the login-methods grid and
// the login method rows of system settings.
// `slots` picks which states the row offers; `unavailable` greys (but still
// shows) the ones operator policy or a missing credential forbids.
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
  const label = useMethodStateLabel()

  return (
    <div className='bg-background inline-flex rounded-md border p-0.5'>
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
              'w-20 rounded-sm py-1 text-xs font-medium transition-colors ' +
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
