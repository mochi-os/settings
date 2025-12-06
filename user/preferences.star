# Mochi settings app: user/preferences
# Copyright Alistair Cunningham 2025

def action_user_preferences(a):
    """User preferences overview"""
    if not require_user(a):
        return
    a.error(501, "Not implemented")

def action_user_preferences_get(a):
    """Get all user preferences"""
    if not require_user(a):
        return
    a.error(501, "Not implemented")

def action_user_preferences_set(a):
    """Set user preferences"""
    if not require_user(a):
        return
    a.error(501, "Not implemented")

def action_user_preferences_reset(a):
    """Reset preferences to defaults"""
    if not require_user(a):
        return
    a.error(501, "Not implemented")
