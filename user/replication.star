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
        "server": {"id": mochi.server.id()},
        "links": mochi.replication.links(),
        "hosts": mochi.replication.hosts(),
    })

def action_user_replication_approve(a):
    """Approve a pending inbound link-request from `peer`."""
    peer = a.input("peer", "")
    if peer == "":
        a.error.label(400, "errors.missing_peer")
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

def action_user_replication_remove(a):
    """Remove `peer` from the active per-user host set."""
    peer = a.input("peer", "")
    if peer == "":
        a.error.label(400, "errors.missing_peer")
        return
    result = mochi.replication.host.remove(peer)
    a.json({"result": result})
