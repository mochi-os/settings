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
# Backed by mochi.replication.{status, joins, join.approve, join.deny,
# pair.remove}. All actions require_admin (server-wide mutation).

def action_system_replication(a):
    """System replication page data: status + pending join requests +
    bulk-bootstrap progress (per (peer, scope))."""
    if not require_admin(a):
        return
    # Read status keys defensively: this published app hot-reloads
    # independently of the server binary, so a user on an older server
    # may hit a build whose status() predates a key (e.g. "offline",
    # added in 0.4.115). Fall back to empty/zero rather than crashing
    # the whole page on a missing optional key.
    status = mochi.replication.status()
    a.json({
        "peer": status.get("peer", ""),
        "fingerprint": status.get("fingerprint", ""),
        "addresses": status.get("addresses", []),
        "pair": status.get("pair", []),
        "irreparable": status.get("irreparable", []),
        "offline": status.get("offline", []),
        "joins": mochi.replication.joins(),
        "bootstrap": mochi.replication.bootstrap.progress(),
        "serving": mochi.replication.bootstrap.serving(),
        "bootstrap_pending": status.get("bootstrap_pending", 0),
    })

def action_system_replication_join_approve(a):
    """Approve a pending inbound pair join-request from `peer`.

    Pairing replicates every user's private keys to `peer`, so it requires
    step-up re-authentication: the operator re-verifies their login
    factor(s) to earn a proof token, consumed by the approve.
    """
    if not require_admin(a):
        return
    peer = a.input("peer", "")
    if peer == "":
        a.error.label(400, "errors.missing_peer")
        return
    if not mochi.user.session.reauthenticate(a.input("token", "")):
        a.error.label(400, "errors.reauthentication_required")
        return
    result = mochi.replication.join.approve(peer)
    a.json({"result": result})

def action_system_replication_join_deny(a):
    """Deny a pending inbound pair join-request from `peer`."""
    if not require_admin(a):
        return
    peer = a.input("peer", "")
    if peer == "":
        a.error.label(400, "errors.missing_peer")
        return
    result = mochi.replication.join.deny(peer)
    a.json({"result": result})

def action_system_replication_pair_remove(a):
    """Remove `peer` from the active pair set."""
    if not require_admin(a):
        return
    peer = a.input("peer", "")
    if peer == "":
        a.error.label(400, "errors.missing_peer")
        return
    result = mochi.replication.pair.remove(peer)
    a.json({"result": result})
