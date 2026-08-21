# Mochi settings app: system/users
# Copyright © 2026 Mochisoft OÜ
# SPDX-License-Identifier: AGPL-3.0-only
# This file is part of Mochi, licensed under the GNU AGPL v3 with the
# Mochi Application Interface Exception - see license.txt and license-exception.md.

def action_system_users(a):
    """User management overview - returns users and count"""
    if not require_admin(a):
        return
    users = mochi.user.list(100, 0)
    count = mochi.user.count()
    a.json({"users": users, "count": count})

# Core validates these too, but a builtin that rejects its argument aborts the
# action, and the server reports that as a 500 carrying the raw Go text - an
# internal API name in an untranslated string. Checking here answers a clean,
# translated 400 instead.
user_sorts = ["id", "username", "status", "last"]
user_orders = ["asc", "desc"]
user_roles = ["user", "administrator"]

def user_identifier(a, uid):
    """Whether uid is shaped like a user id, answering 400 if not."""
    if not uid:
        a.error.label(400, "errors.missing_user_id")
        return False
    if not mochi.text.valid(uid, "id"):
        a.error.label(400, "errors.invalid_value_for_key", key="uid")
        return False
    return True

def action_system_users_list(a):
    """List all users with pagination, search, and sort"""
    if not require_admin(a):
        return
    limit = parse_int(a.input("limit"), 25)
    offset = parse_int(a.input("offset"), 0)
    # Bound to a sane window so a malformed or hostile value can't request an
    # unbounded page.
    if limit < 1 or limit > 100:
        limit = 25
    if offset < 0:
        offset = 0
    search = a.input("search") or ""
    sort = a.input("sort") or "username"
    order = a.input("order") or "asc"
    if sort not in user_sorts:
        a.error.label(400, "errors.invalid_value_for_key", key="sort")
        return
    if order not in user_orders:
        a.error.label(400, "errors.invalid_value_for_key", key="order")
        return

    if search:
        # count is the number of matches, not the size of this page, so the
        # client can page through them and show an honest total. Search takes
        # the same sort and order as list, so the column headers keep working
        # while a search is active.
        users = mochi.user.search(search, limit, offset, sort, order)
        count = mochi.user.count(search)
    else:
        users = mochi.user.list(limit, offset, sort, order)
        count = mochi.user.count()

    a.json({"users": users, "count": count})

def action_system_users_get(a):
    """Get user details"""
    if not require_admin(a):
        return
    uid = a.input("uid")
    if not user_identifier(a, uid):
        return
    user = mochi.user.get(uid)
    if not user:
        a.error.label(404, "errors.user_not_found")
        return
    a.json(user)

def action_system_users_create(a):
    """Create a new user"""
    if not require_admin(a):
        return
    username = a.input("username")
    role = a.input("role") or "user"
    if not username:
        a.error.label(400, "errors.missing_username")
        return
    if not mochi.text.valid(username, "email"):
        a.error.label(400, "errors.invalid_value_for_key", key="username")
        return
    if role not in user_roles:
        a.error.label(400, "errors.invalid_value_for_key", key="role")
        return
    user = mochi.user.create(username, role)
    a.json(user)

def action_system_users_update(a):
    """Update user"""
    if not require_admin(a):
        return
    uid = a.input("uid")
    if not user_identifier(a, uid):
        return
    username = a.input("username")
    role = a.input("role")
    if username != None and not mochi.text.valid(username, "email"):
        a.error.label(400, "errors.invalid_value_for_key", key="username")
        return
    if role != None and role not in user_roles:
        a.error.label(400, "errors.invalid_value_for_key", key="role")
        return
    # Core refuses this too, but a Starlark API refusal aborts the handler and
    # reaches the administrator as a bare 500. Answer it here so they are told
    # what happened; core stays the invariant for every other caller.
    if role != None and role != "administrator":
        target = mochi.user.get(uid)
        if target and target["role"] == "administrator":
            administrators = 0
            for other in mochi.user.list():
                if other["role"] == "administrator" and other["status"] == "active":
                    administrators += 1
            if administrators <= 1:
                a.error.label(400, "errors.cannot_demote_last_administrator")
                return
    mochi.user.update(uid, username, role)
    a.json({"ok": True})

def action_system_users_delete(a):
    """Delete a user"""
    if not require_admin(a):
        return
    uid = a.input("uid")
    if not user_identifier(a, uid):
        return
    mochi.user.delete(uid)
    a.json({"ok": True})

def action_system_users_suspend(a):
    """Suspend a user"""
    if not require_admin(a):
        return
    uid = a.input("uid")
    if not user_identifier(a, uid):
        return
    mochi.user.suspend(uid)
    a.json({"ok": True})

def action_system_users_activate(a):
    """Activate a suspended user"""
    if not require_admin(a):
        return
    uid = a.input("uid")
    if not user_identifier(a, uid):
        return
    mochi.user.activate(uid)
    a.json({"ok": True})

def action_system_users_sessions(a):
    """Get sessions for a user"""
    if not require_admin(a):
        return
    uid = a.input("uid")
    if not user_identifier(a, uid):
        return
    sessions = mochi.user.session.list(uid)
    a.json({"sessions": sessions})

def action_system_users_sessions_revoke(a):
    """Revoke session(s) for a user"""
    if not require_admin(a):
        return
    uid = a.input("uid")
    if not user_identifier(a, uid):
        return
    session_id = a.input("session_id")
    if session_id:
        # Core aborts (a 500) on an unknown session id, so check the list first.
        found = False
        for s in mochi.user.session.list(uid) or []:
            if s.get("id") == session_id:
                found = True
                break
        if not found:
            a.error.label(404, "errors.not_found")
            return
        count = mochi.user.session.revoke(uid, session_id)
    else:
        count = mochi.user.session.revoke(uid)
    a.json({"ok": True, "revoked": count})
