# Mochi settings app: system/users
# Copyright © 2026 Mochi OÜ
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

    if search:
        users = mochi.user.search(search, limit)
        count = len(users)
    else:
        users = mochi.user.list(limit, offset, sort, order)
        count = mochi.user.count()

    a.json({"users": users, "count": count})

def action_system_users_get(a):
    """Get user details"""
    if not require_admin(a):
        return
    uid = a.input("uid")
    if not uid:
        a.error.label(400, "errors.missing_user_id")
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
    user = mochi.user.create(username, role)
    a.json(user)

def action_system_users_update(a):
    """Update user"""
    if not require_admin(a):
        return
    uid = a.input("uid")
    if not uid:
        a.error.label(400, "errors.missing_user_id")
        return
    username = a.input("username")
    role = a.input("role")
    mochi.user.update(uid, username, role)
    a.json({"ok": True})

def action_system_users_delete(a):
    """Delete a user"""
    if not require_admin(a):
        return
    uid = a.input("uid")
    if not uid:
        a.error.label(400, "errors.missing_user_id")
        return
    mochi.user.delete(uid)
    a.json({"ok": True})

def action_system_users_suspend(a):
    """Suspend a user"""
    if not require_admin(a):
        return
    uid = a.input("uid")
    if not uid:
        a.error.label(400, "errors.missing_user_id")
        return
    mochi.user.suspend(uid)
    a.json({"ok": True})

def action_system_users_activate(a):
    """Activate a suspended user"""
    if not require_admin(a):
        return
    uid = a.input("uid")
    if not uid:
        a.error.label(400, "errors.missing_user_id")
        return
    mochi.user.activate(uid)
    a.json({"ok": True})

def action_system_users_sessions(a):
    """Get sessions for a user"""
    if not require_admin(a):
        return
    uid = a.input("uid")
    if not uid:
        a.error.label(400, "errors.missing_user_id")
        return
    sessions = mochi.user.session.list(uid)
    a.json({"sessions": sessions})

def action_system_users_sessions_revoke(a):
    """Revoke session(s) for a user"""
    if not require_admin(a):
        return
    uid = a.input("uid")
    if not uid:
        a.error.label(400, "errors.missing_user_id")
        return
    session_id = a.input("session_id")
    if session_id:
        count = mochi.user.session.revoke(uid, session_id)
    else:
        count = mochi.user.session.revoke(uid)
    a.json({"ok": True, "revoked": count})
