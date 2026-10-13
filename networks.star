# Mochi settings app: Networks
# Copyright © 2026 Mochisoft OÜ
# SPDX-License-Identifier: AGPL-3.0-only
# This file is part of Mochi, licensed under the GNU AGPL v3 with the
# Mochi Application Interface Exception - see license.txt and license-exception.md.
#
# The Networks page: the user's handles and the accounts on them, hosted on
# this server or linked on another. Thin wrappers around mochi.handle.* and
# mochi.account.*; core keeps the rules and the credentials.

# The provider types an account on another network has, hosted or linked.
NETWORK_TYPES = ["fediverse", "bluesky", "xmpp", "matrix", "mastodon", "lemmy"]

def network_account(account):
    """Whether a connected account is one on another network"""
    return account.get("type") in NETWORK_TYPES

def action_networks_data(a):
    """Everything the page shows: whether the server offers networks, the
    networks it hosts accounts on, the domains the user may reserve on, their
    handles, their accounts on the networks and the providers an existing
    account is linked through."""
    networks = mochi.account.networks() or []
    providers = [p for p in (mochi.account.providers() or []) if p.get("type") in NETWORK_TYPES]
    linkable = [p for p in providers if p.get("link")]
    a.json({
        "offered": len(networks) > 0 or len(linkable) > 0,
        "networks": networks,
        "domains": mochi.handle.domains() if networks else [],
        "handles": mochi.handle.list() if networks else {"handles": [], "limit": 0, "counted": 0, "unlimited": False},
        "accounts": [account for account in (mochi.account.list() or []) if network_account(account)],
        "providers": linkable,
        "name": a.user.identity.name,
    })

def action_networks_handle_available(a):
    """Whether a name may be reserved, with the reason when not"""
    name = a.input("name")
    if not name:
        return a.error.label(400, "errors.handle_is_required")
    a.json(mochi.handle.available(name, domain=a.input("domain", "")))

def action_networks_handle_reserve(a):
    """Reserve a handle, or a name under one"""
    name = a.input("name")
    if not name:
        return a.error.label(400, "errors.handle_is_required")
    domain = a.input("domain", "")
    # Core refuses an unavailable name by aborting; answer the reason as a
    # clean 400 the page can show.
    check = mochi.handle.available(name, domain=domain)
    if not check.get("available"):
        return a.error.label(400, "errors.handle_unavailable", reason=check.get("reason", ""))
    a.json(mochi.handle.reserve(name, domain=domain))

def action_networks_handle_release(a):
    """Release a handle with the names under it and the accounts on each"""
    name = a.input("name")
    if not name:
        return a.error.label(400, "errors.handle_is_required")
    a.json({"released": mochi.handle.release(name, domain=a.input("domain", ""))})

def action_networks_account_create(a):
    """Switch a network on for a handle: create the hosted account"""
    network = a.input("network")
    handle = a.input("handle")
    if not network:
        return a.error.label(400, "errors.network_is_required")
    if not handle:
        return a.error.label(400, "errors.handle_is_required")
    if network not in (mochi.account.networks() or []):
        return a.error.label(400, "errors.invalid_type")
    fields = {"handle": handle}
    domain = a.input("domain")
    if domain:
        fields["domain"] = domain
    a.json(mochi.account.add(network, **fields))

def action_networks_account_link(a):
    """Link an existing account: a form provider signs in and answers the
    account; an OAuth provider answers the URL the browser visits"""
    type = a.input("type")
    if not type:
        return a.error.label(400, "errors.type_is_required")
    provider = None
    for p in mochi.account.providers() or []:
        if p.get("type") == type and p.get("link"):
            provider = p
            break
    if not provider:
        return a.error.label(400, "errors.invalid_type")
    fields = {}
    for field in provider["link"].get("fields") or []:
        name = field.get("name")
        value = a.input(name)
        if value:
            if len(value) > 4096:
                return a.error.label(400, "errors.value_too_long", maximum=4096)
            fields[name] = value
        elif field.get("required"):
            return a.error.label(400, "errors.field_required", field=field.get("label") or name)
    if provider["link"].get("flow") == "oauth":
        fields["target"] = a.input("target", "/settings/user/networks")
    a.json(mochi.account.link(type, **fields))

def networks_account(a):
    """The account an action names, when it is one on a network"""
    id = a.input("id")
    if not id:
        a.error.label(400, "errors.id_is_required")
        return None
    account = mochi.account.get(id)
    if not account or not network_account(account):
        a.error.label(404, "errors.account_not_found")
        return None
    return account

def action_networks_account_remove(a):
    """Remove an account: a hosted one with everything it published, a linked
    one leaving what it published on its server"""
    account = networks_account(a)
    if not account:
        return
    a.json({"removed": mochi.account.remove(account["id"])})

def action_networks_account_update(a):
    """Rename an account: the name its profile shows"""
    account = networks_account(a)
    if not account:
        return
    label = a.input("label")
    if label == None:
        return a.error.label(400, "errors.nothing_to_update")
    label = label.strip()
    if len(label) > 100:
        return a.error.label(400, "errors.value_too_long", maximum=100)
    mochi.account.update(account["id"], label=label)
    a.json(mochi.account.get(account["id"]))

def action_networks_account_test(a):
    """Check a linked account with its server"""
    account = networks_account(a)
    if not account:
        return
    a.json(mochi.account.test(account["id"]))

def action_networks_account_keys(a):
    """A hosted account's keys"""
    account = networks_account(a)
    if not account:
        return
    a.json(mochi.account.key.list(account["id"]))

def action_networks_account_keys_replace(a):
    """Replace a hosted account's signing key"""
    account = networks_account(a)
    if not account:
        return
    a.json({"replaced": mochi.account.key.replace(account["id"])})

def action_networks_account_keys_recovery(a):
    """Make a Bluesky account's recovery key, shown once"""
    account = networks_account(a)
    if not account:
        return
    a.json(mochi.account.key.recovery(account["id"]))
