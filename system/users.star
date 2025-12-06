# Mochi settings app: system/users
# Copyright Alistair Cunningham 2025

def action_system_users(a):
    """User management overview - returns users and count"""
    if not require_admin(a):
        return
    users = mochi.user.list(100, 0)
    count = mochi.user.count()
    a.json({"users": users, "count": count})

def action_system_users_list(a):
    """List all users with pagination"""
    if not require_admin(a):
        return
    limit = int(a.input("limit") or "100")
    offset = int(a.input("offset") or "0")
    users = mochi.user.list(limit, offset)
    count = mochi.user.count()
    a.json({"users": users, "count": count})

def action_system_users_get(a):
    """Get user details"""
    if not require_admin(a):
        return
    id = a.input("id")
    if not id:
        a.error(400, "Missing user id")
        return
    user = mochi.user.get.id(int(id))
    if not user:
        a.error(404, "User not found")
        return
    a.json(user)

def action_system_users_create(a):
    """Create a new user"""
    if not require_admin(a):
        return
    username = a.input("username")
    role = a.input("role") or "user"
    if not username:
        a.error(400, "Missing username")
        return
    user = mochi.user.create(username, role)
    a.json(user)

def action_system_users_update(a):
    """Update user"""
    if not require_admin(a):
        return
    id = a.input("id")
    if not id:
        a.error(400, "Missing user id")
        return
    username = a.input("username")
    role = a.input("role")
    mochi.user.update(int(id), username, role)
    a.json({"ok": True})

def action_system_users_delete(a):
    """Delete a user"""
    if not require_admin(a):
        return
    id = a.input("id")
    if not id:
        a.error(400, "Missing user id")
        return
    mochi.user.delete(int(id))
    a.json({"ok": True})
