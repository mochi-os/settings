# Mochi settings app: system/replication
# Copyright Alistair Cunningham 2026
#
# Server pair (whole-server replication) management page. Lists the
# current pair members, pending inbound join-requests, and the local
# peer-id; admin can approve/deny incoming requests and remove existing
# pair members. Initiating a new pair join is operator-only via
# `mochictl replica join <existing-peer>` (the destination server must
# be freshly installed; see claude/plans/replication.md).
#
# Backed by mochi.replication.{status, joins, join_approve, join_deny,
# pair_remove}. All actions require_admin (server-wide mutation).

def action_system_replication(a):
    """System replication page data: status + pending join requests +
    bulk-bootstrap progress (per (peer, scope))."""
    if not require_admin(a):
        return
    status = mochi.replication.status()
    a.json({
        "peer": status["peer"],
        "pair": status["pair"],
        "joins": mochi.replication.joins(),
        "bootstrap": mochi.replication.bootstrap_progress(),
        "bootstrap_pending": status["bootstrap_pending"],
    })

def action_system_replication_join_approve(a):
    """Approve a pending inbound pair join-request from `peer`."""
    if not require_admin(a):
        return
    peer = a.input("peer", "")
    if peer == "":
        a.error.label(400, "errors.missing_peer")
        return
    result = mochi.replication.join_approve(peer)
    a.json({"result": result})

def action_system_replication_join_deny(a):
    """Deny a pending inbound pair join-request from `peer`."""
    if not require_admin(a):
        return
    peer = a.input("peer", "")
    if peer == "":
        a.error.label(400, "errors.missing_peer")
        return
    result = mochi.replication.join_deny(peer)
    a.json({"result": result})

def action_system_replication_pair_remove(a):
    """Remove `peer` from the active pair set."""
    if not require_admin(a):
        return
    peer = a.input("peer", "")
    if peer == "":
        a.error.label(400, "errors.missing_peer")
        return
    result = mochi.replication.pair_remove(peer)
    a.json({"result": result})
