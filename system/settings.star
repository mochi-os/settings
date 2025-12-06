# Mochi settings app: system/settings
# Copyright Alistair Cunningham 2025

def action_system_settings(a):
    """System settings overview"""
    if not require_admin(a):
        return
    a.error(501, "Not implemented")

def action_system_settings_list(a):
    """List all system settings with metadata"""
    if not require_admin(a):
        return
    a.error(501, "Not implemented")

def action_system_settings_get(a):
    """Get a single setting"""
    if not require_admin(a):
        return
    a.error(501, "Not implemented")

def action_system_settings_set(a):
    """Set a system setting"""
    if not require_admin(a):
        return
    a.error(501, "Not implemented")
