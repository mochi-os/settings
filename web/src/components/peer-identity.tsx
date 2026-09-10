// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { useLingui } from '@lingui/react/macro'
import { shellClipboardWrite, toast } from '@mochi/web'
import { hyphenateFingerprint } from '@/lib/peer'

// A peer's identity block: the announced name (a self-asserted label)
// above the hyphenated fingerprint, with the full peer ID via tooltip and
// click-to-copy. The fingerprint is the authoritative identifier; the name
// is display-only and nothing keys logic off it.
export function PeerIdentity({
  peer,
  name,
  fingerprint,
}: {
  peer: string
  name?: string
  fingerprint?: string
}) {
  const { t } = useLingui()
  return (
    <div className='min-w-0'>
      {name && <div className='text-sm font-medium break-all'>{name}</div>}
      <button
        type='button'
        className='text-muted-foreground hover:text-foreground cursor-pointer font-mono text-xs'
        title={peer}
        onClick={async () => {
          const ok = await shellClipboardWrite(peer)
          if (ok) toast.success(t`Peer id copied`)
        }}
      >
        {hyphenateFingerprint(fingerprint ?? '') || peer}
      </button>
    </div>
  )
}
