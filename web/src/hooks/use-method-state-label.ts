// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { useLingui } from '@lingui/react/macro'

// The label of a login method state, shared by the control and anything that
// names a state in text (a reset dialog's default value).
export function useMethodStateLabel() {
  const { t } = useLingui()
  return (slot: string): string =>
    slot === 'disabled'
      ? t`Disabled`
      : slot === 'allowed'
        ? t`Allowed`
        : slot === 'required'
          ? t`Required`
          : slot
}
