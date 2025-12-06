# Mochi settings app: user/preferences
# Copyright Alistair Cunningham 2025

# Preference schema
preferences_schema = [
    {
        "key": "theme",
        "type": "select",
        "options": ["light", "dark", "auto"],
        "default": "auto",
        "label": "Theme",
        "description": "Color scheme for the interface"
    },
    {
        "key": "language",
        "type": "select",
        "options": ["en", "de", "fr", "es", "ja", "zh"],
        "default": "en",
        "label": "Language",
        "description": "Interface language"
    },
    {
        "key": "timezone",
        "type": "timezone",
        "default": "auto",
        "label": "Timezone",
        "description": "Timezone for displaying dates and times"
    },
]

def action_user_preferences(a):
    """User preferences overview - returns all preferences with schema"""
    if not require_user(a):
        return
    prefs = {}
    for p in preferences_schema:
        value = a.user.preference.get(p["key"])
        prefs[p["key"]] = value if value != None else p["default"]
    a.json({"preferences": prefs, "schema": preferences_schema})

def action_user_preferences_set(a):
    """Set user preferences"""
    if not require_user(a):
        return
    for p in preferences_schema:
        value = a.input(p["key"])
        if value:
            if p["type"] == "select" and value not in p["options"]:
                a.error(400, "Invalid value for " + p["key"])
                return
            a.user.preference.set(p["key"], value)
    a.json({"ok": True})

def action_user_preferences_reset(a):
    """Reset preferences to defaults"""
    if not require_user(a):
        return
    for p in preferences_schema:
        a.user.preference.delete(p["key"])
    a.json({"ok": True})
