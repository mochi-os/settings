# Mochi settings app: user/preferences
# Copyright Alistair Cunningham 2025-2026

# Preference schema
preferences_schema = [
    {
        "key": "appearance",
        "type": "select",
        "options": ["light", "dark", "auto"],
        "default": "auto",
        "label": "Appearance",
        "description": "Light or dark mode"
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
    {
        "key": "date_format",
        "type": "select",
        "options": ["auto", "YYYY-MM-DD", "DD/MM/YYYY", "DD.MM.YYYY", "MM/DD/YYYY", "D MMM YYYY"],
        "default": "auto",
        "label": "Date format",
        "description": "How dates are displayed"
    },
    {
        "key": "time_format",
        "type": "select",
        "options": ["auto", "24h", "12h"],
        "default": "auto",
        "label": "Time format",
        "description": "12-hour or 24-hour clock"
    },
    {
        "key": "timestamp_display",
        "type": "select",
        "options": ["auto", "relative", "absolute"],
        "default": "auto",
        "label": "Timestamp display",
        "description": "Show timestamps as relative (5m, 3h) or absolute (date and time)"
    },
    {
        "key": "week_start",
        "type": "select",
        "options": ["auto", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
        "default": "auto",
        "label": "Week starts on",
        "description": "First day of the week in calendars"
    },
    {
        "key": "number_format",
        "type": "select",
        "options": ["auto", "1,000.00", "1.000,00", "1 000,00", "1'000.00", "1,00,000.00"],
        "default": "auto",
        "label": "Number format",
        "description": "How numbers are formatted"
    },
    {
        "key": "units",
        "type": "select",
        "options": ["auto", "metric", "imperial", "usa"],
        "default": "auto",
        "label": "Units",
        "description": "Measurement system for distances, weights, etc."
    },
]

def action_user_preferences(a):
    """User preferences overview - returns all preferences with schema"""
    prefs = {}
    for p in preferences_schema:
        value = a.user.preference.get(p["key"])
        prefs[p["key"]] = value if value != None else p["default"]
    # Include theme preference (not in schema since options are dynamic)
    theme = a.user.preference.get("theme")
    default_theme = mochi.setting.get("default_theme")
    prefs["theme"] = theme if theme != None else default_theme
    a.json({"preferences": prefs, "schema": preferences_schema, "themes": mochi.app.themes(), "default_theme": default_theme})

def action_user_preferences_set(a):
    """Set user preferences"""
    for p in preferences_schema:
        value = a.input(p["key"])
        if value:
            if p["type"] == "select" and value not in p["options"]:
                a.error(400, "Invalid value for " + p["key"])
                return
            a.user.preference.set(p["key"], value)
    # Handle theme preference (dynamic options, validated separately)
    theme = a.input("theme")
    if theme != None:
        if theme == "":
            a.user.preference.delete("theme")
        else:
            a.user.preference.set("theme", theme)
    a.json({"ok": True})

def action_user_preferences_reset(a):
    """Reset preferences to defaults"""
    for p in preferences_schema:
        a.user.preference.delete(p["key"])
    a.user.preference.delete("theme")
    a.json({"ok": True})
