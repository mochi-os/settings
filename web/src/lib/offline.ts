// Shared helpers for the replication pages' amber "Offline" badge, fed by the
// server's per-member offline-since timestamp (0 when reachable).
import { i18n } from '@lingui/core'

// How long a member must be unreachable before the badge appears - long enough
// to ride out a restart or blip (the server's reconnect backoff caps near an
// hour). The 24h offline notification is separate and fires server-side.
export const offlineBadgeSeconds = 3600

// offlineDuration renders the unreachable duration spelled out and localized
// ("15 hours" / "2 days") from the offline-since unix timestamp. Intl's unit
// style handles plural agreement and translation of the unit for every locale,
// so the only translated string is the "Offline {0}" wrapper around it.
export function offlineDuration(since: number): string {
  const hours = Math.floor((Date.now() / 1000 - since) / 3600)
  const [value, unit] = hours >= 24 ? [Math.floor(hours / 24), 'day'] : [Math.max(1, hours), 'hour']
  // i18n-format-ok: localized unit duration; Intl handles plural/agreement per locale
  return new Intl.NumberFormat(i18n.locale, { style: 'unit', unit, unitDisplay: 'long' }).format(value)
}

// offlineActive reports whether the offline badge should show for this
// member: it has an offline-since and has been unreachable past the threshold.
export function offlineActive(since: number): boolean {
  return since > 0 && Date.now() / 1000 - since > offlineBadgeSeconds
}
