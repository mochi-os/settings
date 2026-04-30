# Mochi settings app: system/settings
# Copyright Alistair Cunningham 2025-2026

def action_system_settings_list(a):
    """List all system settings with metadata"""
    if not require_admin(a):
        return
    settings = mochi.setting.list()
    a.json({"settings": settings})

def action_system_settings_get(a):
    """Get a single setting"""
    if not require_admin(a):
        return
    name = a.input("name")
    if not name:
        a.error_label(400, "errors.missing_setting_name")
        return
    value = mochi.setting.get(name)
    a.json({"name": name, "value": value})

def action_system_settings_set(a):
    """Set a system setting"""
    if not require_admin(a):
        return
    name = a.input("name")
    value = a.input("value")
    if not name:
        a.error_label(400, "errors.missing_setting_name")
        return
    if value == None:
        a.error_label(400, "errors.missing_setting_value")
        return
    mochi.setting.set(name, value)
    a.json({"ok": True})
