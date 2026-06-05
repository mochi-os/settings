// Shared helpers for the replication pages' amber "Offline" badge, fed by the
// server's per-member offline-since timestamp (0 when reachable).

// How long a member must be unreachable before the badge appears - long enough
// to ride out a restart or blip (the server's reconnect backoff caps near an
// hour). The 24h offline notification is separate and fires server-side.
export const offlineBadgeSeconds = 3600

// offlineDuration renders a compact unreachable duration ("3h" / "2d") from
// the offline-since unix timestamp.
export function offlineDuration(since: number): string {
  const hours = Math.floor((Date.now() / 1000 - since) / 3600)
  return hours >= 24 ? `${Math.floor(hours / 24)}d` : `${Math.max(1, hours)}h`
}

// offlineActive reports whether the offline badge should show for this
// member: it has an offline-since and has been unreachable past the threshold.
export function offlineActive(since: number): boolean {
  return since > 0 && Date.now() / 1000 - since > offlineBadgeSeconds
}
