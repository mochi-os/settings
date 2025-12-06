# Mochi settings app: system/users
# Copyright Alistair Cunningham 2025

def action_system_users(a):
    """User management overview"""
    if not require_admin(a):
        return
    a.error(501, "Not implemented")

def action_system_users_list(a):
    """List all users with pagination"""
    if not require_admin(a):
        return
    a.error(501, "Not implemented")

def action_system_users_get(a):
    """Get user details"""
    if not require_admin(a):
        return
    a.error(501, "Not implemented")

def action_system_users_create(a):
    """Create a new user"""
    if not require_admin(a):
        return
    a.error(501, "Not implemented")

def action_system_users_update(a):
    """Update user role"""
    if not require_admin(a):
        return
    a.error(501, "Not implemented")

def action_system_users_delete(a):
    """Delete a user"""
    if not require_admin(a):
        return
    a.error(501, "Not implemented")
