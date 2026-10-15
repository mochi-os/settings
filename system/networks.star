# Mochi settings app: system/networks
# Copyright © 2026 Mochisoft OÜ
# SPDX-License-Identifier: AGPL-3.0-only
# This file is part of Mochi, licensed under the GNU AGPL v3 with the
# Mochi Application Interface Exception - see license.txt and license-exception.md.
#
# The owner's view of the other networks: each network's state for the Status
# page, and the table of every handle with its holder.

def action_system_networks(a):
    """Each network's state: working, unavailable with the reason, or disabled."""
    if not require_admin(a):
        return
    a.json(mochi.server.networks())

def action_system_handles_list(a):
    """Every handle on the server with its holder."""
    if not require_admin(a):
        return
    a.json({"handles": mochi.handle.registry(), "domains": mochi.handle.domains()})

def action_system_handles_release(a):
    """Release any handle: its accounts and the names under it go with it."""
    if not require_admin(a):
        return
    name = a.input("name", "")
    if not name:
        a.error.label(400, "errors.handle_is_required")
        return
    mochi.handle.release(name, domain=a.input("domain", ""))
    a.json({"released": True})

def action_system_account_takedown(a):
    """Take a hosted Bluesky account down, or restore it: taken down, its
    repository is not served and the relays are told; the account and its
    records stay (phase 19)."""
    if not require_admin(a):
        return
    did = a.input("did", "")
    if not did:
        a.error.label(400, "errors.account_is_required")
        return
    down = str(a.input("down", "true")).lower() in ("true", "1", "on", "yes")
    mochi.server.account.takedown(did, down=down)
    a.json({"status": "takendown" if down else ""})
