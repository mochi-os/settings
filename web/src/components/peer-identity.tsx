import { useLingui } from '@lingui/react/macro'
import { shellClipboardWrite, toast } from '@mochi/web'

// Fingerprints travel unhyphenated (9 chars) and display hyphenated,
// matching entity fingerprints.
export function hyphenateFingerprint(fingerprint: string) {
  if (fingerprint.length !== 9) return fingerprint
  return `${fingerprint.slice(0, 3)}-${fingerprint.slice(3, 6)}-${fingerprint.slice(6)}`
}

// Display name for sorting peers: the announced name when present, else
// the hyphenated fingerprint.
export function peerDisplayName(p: { name?: string; fingerprint?: string; peer: string }) {
  return p.name || hyphenateFingerprint(p.fingerprint ?? '') || p.peer
}

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
