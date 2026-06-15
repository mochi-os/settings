# Mochi settings app: user/replication
# Copyright Alistair Cunningham 2026
#
# Per-user replication settings — surfaces pending inbound link-requests
# and the current host set. Adding a host is not a settings action; it's
# the signup-form "Advanced → replicate existing account" flow on the
# destination server (apps/login). This page handles approval of
# inbound requests + ongoing management of the active host set only.
#
# Backed by mochi.replication.{links, hosts, link.approve, link.deny,
# host.remove}.

def action_user_replication(a):
    """Per-user replication page data: pending requests + my hosts.

    Also returns the local username and this server's peer id so the
    page can prompt the user with the exact values to type into the
    "replicate an existing account" form on the destination server."""
    a.json({
        "user": {"username": a.user.username},
        "server": {"id": mochi.server.id(), "fingerprint": mochi.server.fingerprint()},
        "links": mochi.replication.links(),
        "hosts": mochi.replication.hosts(),
    })

def action_user_replication_approve(a):
    """Approve a pending inbound link-request from `peer`.

    Approving replicates the user's private keys to `peer`, so it requires
    step-up re-authentication: the user re-verifies their login factor(s)
    to earn a proof token, consumed by the approve.
    """
    peer = a.input("peer", "")
    if peer == "":
        a.error.label(400, "errors.missing_peer")
        return
    if not mochi.user.session.reauthenticate(a.input("token", "")):
        a.error.label(400, "errors.reauthentication_required")
        return
    result = mochi.replication.link.approve(peer)
    a.json({"result": result})

def action_user_replication_deny(a):
    """Deny a pending inbound link-request from `peer`."""
    peer = a.input("peer", "")
    if peer == "":
        a.error.label(400, "errors.missing_peer")
        return
    result = mochi.replication.link.deny(peer)
    a.json({"result": result})

def action_user_replication_leave(a):
    """Remove the user's account from THIS server (leave the replica set).

    The primary "remove a replica" path: purges this server's local copy
    (the account survives on the user's other servers) and announces the
    departure to them. Destructive, so step-up gated like close. The UI hides
    this when there is no other copy; mochi.replication.leave() also refuses
    that case as a backstop.
    """
    if not mochi.user.session.reauthenticate(a.input("token", "")):
        a.error.label(400, "errors.reauthentication_required")
        return
    mochi.replication.leave()
    a.json({"ok": True})

def action_user_replication_remove(a):
    """Advanced: forget an unreachable host — remove `peer` from the host set
    and tell it to purge its copy. The local 'remove from this server' path
    (leave) is preferred; this exists for hosts you can't sign in to. Step-up
    gated, as it deletes another host's copy."""
    peer = a.input("peer", "")
    if peer == "":
        a.error.label(400, "errors.missing_peer")
        return
    if not mochi.user.session.reauthenticate(a.input("token", "")):
        a.error.label(400, "errors.reauthentication_required")
        return
    result = mochi.replication.host.remove(peer)
    a.json({"result": result})
