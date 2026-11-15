// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

export interface DestinationRow {
  type: string
  target: string
}

export interface Category {
  id: string
  label: string
  // Read-time translated label for the seeded categories; label is the
  // stored value. Render display, edit label.
  display?: string
  default: number
  created: number
  destinations: DestinationRow[]
}

export interface Account {
  id: string
  type: string
  label: string
  identifier?: string
  enabled: number
  // The device a push account was registered from, or "" for none.
  device?: string
}

export interface Feed {
  id: string
  name: string
  enabled: number
}

// A phone or tablet the user runs Mochi on, or a browser that registered for
// push.
export interface Device {
  id: string
  label: string
  created: number
  seen: number
}

export interface DestinationsAvailable {
  accounts: Account[]
  feeds: Feed[]
  devices: Device[]
}

export interface Topic {
  app: { id: string; name: string }
  topic: string
  object: string
  name: string
  label: string
  category: string | null
  created: number
}
