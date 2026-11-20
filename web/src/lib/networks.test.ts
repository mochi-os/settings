// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { describe, expect, it } from 'vitest'
import { arrival, networkSwitchId } from './networks'

const handle = { domain: 'example.org', name: 'alice' }
const mastodon = { type: 'mastodon' }
const bluesky = { type: 'bluesky' }

describe('arrival', () => {
  it('goes to the switch on the first handle where the server hosts the network', () => {
    expect(
      arrival('bluesky', ['fediverse', 'bluesky'], [bluesky], handle)
    ).toEqual({
      kind: 'switch',
      id: networkSwitchId(handle, 'bluesky'),
    })
  })

  it('goes to the handle field when there is no handle yet', () => {
    expect(arrival('xmpp', ['xmpp'], [], undefined)).toEqual({ kind: 'handle' })
  })

  it('opens the link form where the network is only linked', () => {
    expect(arrival('bluesky', [], [bluesky], handle)).toEqual({
      kind: 'link',
      type: 'bluesky',
    })
  })

  it('links a fediverse account through Mastodon', () => {
    expect(arrival('fediverse', ['bluesky'], [mastodon], handle)).toEqual({
      kind: 'link',
      type: 'mastodon',
    })
  })

  it('does nothing for a network the server does not offer, or none', () => {
    expect(arrival('matrix', ['fediverse'], [mastodon], handle)).toBeNull()
    expect(arrival(null, ['fediverse'], [mastodon], handle)).toBeNull()
  })
})
