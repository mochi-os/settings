// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

// How long a settings query's answer counts as fresh, in milliseconds. Each
// route's loader starts its page's queries beside the route's code, and the
// page's hooks take the loader's answer while it is this fresh rather than
// ask again.
export const fresh = {
  // A page's own data is held only for that gap, so a session revoked or a
  // passkey removed in another tab shows on the next visit.
  page: 3_000,
  // The layout's: the role, delegations and networks the sidebar is drawn
  // from, which every page shows. Each change made here refetches them.
  layout: 30_000,
}
