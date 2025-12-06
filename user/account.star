# Mochi settings app: user/account
# Copyright Alistair Cunningham 2025

def action_user_account(a):
    """User account overview"""
    if not require_user(a):
        return
    a.error(501, "Not implemented")

def action_user_account_identity(a):
    """Get user identity information"""
    if not require_user(a):
        return
    a.error(501, "Not implemented")

def action_user_account_sessions(a):
    """List active sessions for current user"""
    if not require_user(a):
        return
    a.error(501, "Not implemented")

def action_user_account_session_revoke(a):
    """Revoke a session"""
    if not require_user(a):
        return
    a.error(501, "Not implemented")
