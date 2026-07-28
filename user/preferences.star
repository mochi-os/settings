# Mochi settings app: user/preferences
# Copyright © 2026 Mochisoft OÜ
# SPDX-License-Identifier: AGPL-3.0-only
# This file is part of Mochi, licensed under the GNU AGPL v3 with the
# Mochi Application Interface Exception - see license.txt and license-exception.md.

# Preference schema. Only the fields the server uses are kept: `key` and
# `default` populate the overview, `type`/`options` drive validation in
# action_user_preferences_set. The client renders its own translated labels and
# option lists, so no label/description is stored or sent here.
preferences_schema = [
    {
        "key": "appearance",
        "type": "select",
        "options": ["light", "dark", "auto"],
        "default": "auto",
    },
    {
        "key": "density",
        "type": "select",
        "options": ["theme", "compact", "comfortable", "spacious"],
        "default": "theme",
    },
    {
        "key": "radius",
        "type": "select",
        "options": ["theme", "0rem", "0.375rem", "0.75rem", "1.75rem"],
        "default": "theme",
    },
    {
        "key": "card",
        "type": "select",
        "options": ["theme", "flat", "raised"],
        "default": "theme",
    },
    {
        "key": "background",
        "type": "select",
        "options": ["theme", "off"],
        "default": "theme",
    },
    {
        "key": "font",
        "type": "select",
        "options": ["theme", "system", "serif", "dyslexia"],
        "default": "theme",
    },
    {
        "key": "font_size",
        "type": "select",
        "options": ["theme", "small", "normal", "large", "extra-large"],
        "default": "theme",
    },
    {
        "key": "language",
        "type": "locale-language",
        "default": "en",
    },
    {
        "key": "timezone",
        "type": "timezone",
        "default": "auto",
    },
    {
        "key": "date_format",
        "type": "select",
        "options": ["auto", "YYYY-MM-DD", "DD/MM/YYYY", "DD.MM.YYYY", "MM/DD/YYYY", "D MMM YYYY"],
        "default": "auto",
    },
    {
        "key": "time_format",
        "type": "select",
        "options": ["auto", "24h", "12h"],
        "default": "auto",
    },
    {
        "key": "timestamp_display",
        "type": "select",
        "options": ["auto", "relative", "absolute"],
        "default": "auto",
    },
    {
        "key": "week_start",
        "type": "select",
        "options": ["auto", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
        "default": "auto",
    },
    {
        "key": "number_format",
        "type": "select",
        "options": ["auto", "1,000.00", "1.000,00", "1 000,00", "1'000.00", "1,00,000.00"],
        "default": "auto",
    },
    {
        "key": "units",
        "type": "select",
        "options": ["auto", "metric", "imperial", "usa"],
        "default": "auto",
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
    a.json({"preferences": prefs, "themes": mochi.app.themes(), "presets": mochi.app.presets(), "default_theme": default_theme})

def action_user_preferences_set(a):
    """Set user preferences.

    A key absent from the request is left alone; every key present is
    validated before anything is written, so a payload carrying one good
    and one bad value stores neither. Clearing a preference is a separate
    action - see action_user_preferences_unset - so there is no value
    here that means "delete".
    """
    # Validate the whole payload first, collecting what to write. Nothing
    # in the apply loop below can then fail a check partway through.
    writes = []
    for p in preferences_schema:
        value = a.input(p["key"])
        if value == None:
            continue
        if p["type"] == "select" and value not in p["options"]:
            a.error.label(400, "errors.invalid_value_for_key", key=p["key"])
            return
        # locale-language: BCP 47 tag, lowercase. Accept the value if it
        # looks plausible — server-side resolver falls back gracefully if
        # no catalog matches, so we don't need to enforce an installed list.
        if p["type"] == "locale-language":
            if len(value) > 35 or len(value) < 2:
                a.error.label(400, "errors.invalid_value_for_key", key=p["key"])
                return
            for ch in value.elems():
                if not (ch.isalnum() or ch == "-"):
                    a.error.label(400, "errors.invalid_value_for_key", key=p["key"])
                    return
        writes.append((p["key"], value))

    # Theme options are dynamic (every installed app contributes some), so
    # validate against the ids this user can actually see.
    theme = a.input("theme")
    if theme != None:
        if theme not in [t["id"] for t in mochi.app.themes()]:
            a.error.label(400, "errors.invalid_value_for_key", key="theme")
            return
        writes.append(("theme", theme))

    for key, value in writes:
        a.user.preference.set(key, value)
    a.json({"ok": True})

def action_user_preferences_unset(a):
    """Clear the named preferences, so each falls back to its default.

    Keys are repeated `key` fields. Unknown keys are rejected rather than
    ignored, so a client typo surfaces instead of silently doing nothing.
    """
    keys = a.inputs("key")
    if not keys:
        a.error.label(400, "errors.missing_key")
        return
    known = [p["key"] for p in preferences_schema] + ["theme"]
    for key in keys:
        if key not in known:
            a.error.label(400, "errors.invalid_value_for_key", key=key)
            return
    for key in keys:
        a.user.preference.delete(key)
    a.json({"ok": True})

def action_user_preferences_reset(a):
    """Reset preferences to defaults"""
    for p in preferences_schema:
        a.user.preference.delete(p["key"])
    a.user.preference.delete("theme")
    a.json({"ok": True})
