# Mochi settings app: system/networks
# Copyright © 2026 Mochisoft OÜ
# SPDX-License-Identifier: AGPL-3.0-only
# This file is part of Mochi, licensed under the GNU AGPL v3 with the
# Mochi Application Interface Exception - see license.txt and license-exception.md.
#
# The owner's view of the other networks: each network's state for the Status
# page, each Matrix domain's signing key, and the table of every handle with
# its holder.

def action_system_networks(a):
    """Each network's state: working, unavailable with the reason, or disabled."""
    if not require_admin(a):
        return
    a.json(mochi.server.networks())

def action_system_networks_key_replace(a):
    """Replace the Matrix signing key of one of the server's domains: other
    servers fetch the new one, and what the old one signed stays verifiable."""
    if not require_admin(a):
        return
    if not mochi.user.session.reauthenticate(a.input("token", "")):
        a.error.label(400, "errors.reauthentication_required")
        return
    domain = a.input("domain", "")
    matrix = (mochi.server.networks().get("networks") or {}).get("matrix") or {}
    if not domain or domain not in [k.get("domain") for k in matrix.get("keys") or []]:
        a.error.label(404, "errors.domain_not_found")
        return
    a.json({"key": mochi.server.key.replace(domain)})

def action_system_handles_list(a):
    """A page of the handles on the server a search matches, with their
    holders, how many it matches and the server's domains."""
    if not require_admin(a):
        return
    limit = parse_int(a.input("limit"), 25)
    offset = parse_int(a.input("offset"), 0)
    # Bound to a sane window, as the users list is.
    if limit < 1 or limit > 100:
        limit = 25
    if offset < 0:
        offset = 0
    search = a.input("search") or ""
    a.json({
        "handles": mochi.handle.registry(search=search, limit=limit, offset=offset),
        "count": mochi.handle.count(search=search),
        "domains": mochi.handle.domains(),
    })

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
