// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

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
