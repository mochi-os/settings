# Mochi Settings — notifications management
# Proxies to the notifications service so the settings UI can manage categories
# and topics without app-level coupling.
# Copyright © 2026 Mochisoft OÜ
# SPDX-License-Identifier: AGPL-3.0-only
# This file is part of Mochi, licensed under the GNU AGPL v3 with the
# Mochi Application Interface Exception - see license.txt and license-exception.md.

# destinations_input decodes and shape-checks the client's destinations JSON
# parameter: a bounded list of dicts, or absent. Returns (valid, destinations);
# on invalid input the caller answers 400. Mirrors the notifications app's own
# actions - a decode abort here surfaced as an internal error, not a 400.
def destinations_input(a):
    raw = a.input("destinations", "").strip()
    if not raw:
        return True, None
    destinations = json.decode(raw, None)
    if type(destinations) != "list" or len(destinations) > 100:
        return False, None
    for dest in destinations:
        if type(dest) != "dict":
            return False, None
        if dest.get("type", "") not in ("web", "account", "rss"):
            return False, None
        if len(str(dest.get("target", ""))) > 64:
            return False, None
    return True, destinations

def action_notifications_categories(a):
    result = mochi.service.call("notifications", "category/list")
    a.json(result or [])

def action_notifications_categories_create(a):
    label = a.input("label", "").strip()
    if not label:
        return a.error.label(400, "errors.label_is_required")
    default_raw = a.input("default", "")
    default = 1 if default_raw == "1" or default_raw == "true" else None
    valid, destinations = destinations_input(a)
    if not valid:
        return a.error.label(400, "errors.invalid_destinations")
    result = mochi.service.call("notifications", "category/create", label, destinations, default)
    if not result:
        return a.error.label(400, "errors.invalid_category")
    a.json({"id": result})

def action_notifications_categories_update(a):
    id = a.input("id", "").strip()
    if not id or len(id) > 64:
        return a.error.label(400, "errors.invalid_id")
    label_raw = a.input("label")
    default_raw = a.input("default")
    label = label_raw if label_raw != None and label_raw != "" else None
    # The service answers with a bare False for several different reasons, so
    # a rejected label would otherwise be reported as "not found". Check the
    # bound it applies here, leaving False to mean what the 404 claims.
    if label != None and len(label) > 100:
        return a.error.label(400, "errors.invalid_value_for_key", key="label")
    default = None
    if default_raw != None and default_raw != "":
        default = 1 if default_raw == "1" or default_raw == "true" else 0
    valid, destinations = destinations_input(a)
    if not valid:
        return a.error.label(400, "errors.invalid_destinations")
    ok = mochi.service.call("notifications", "category/update", id, label, destinations, default)
    if not ok:
        return a.error.label(404, "errors.not_found")
    a.json({"ok": True})

def action_notifications_categories_delete(a):
    id = a.input("id", "").strip()
    reassign = a.input("reassign", "").strip()
    if not id or len(id) > 64:
        return a.error.label(400, "errors.invalid_id")
    if reassign == "" or len(reassign) > 64:
        return a.error.label(400, "errors.reassign_is_required")
    ok = mochi.service.call("notifications", "category/delete", id, reassign)
    if not ok:
        return a.error.label(400, "errors.could_not_delete")
    a.json({"ok": True})

def action_notifications_categories_test(a):
    id = a.input("id", "").strip()
    if not id or len(id) > 64:
        return a.error.label(400, "errors.invalid_id")
    result = mochi.service.call("notifications", "category/test", id)
    a.json(result or {"sent": 0, "web": False})

def action_notifications_topics(a):
    result = mochi.service.call("notifications", "topic/list")
    a.json(result or [])

def action_notifications_topics_set_category(a):
    # app="" identifies server-originated topics (upgrade alerts etc.).
    # An empty category clears the topic's category; anything over-long cannot
    # name a real category and is rejected rather than treated as a clear.
    app = a.input("app", "").strip()
    topic = a.input("topic", "").strip()
    object = a.input("object", "").strip()
    category = a.input("category", "").strip()
    if category == "":
        category = None
    elif len(category) > 64:
        return a.error.label(404, "errors.not_found")
    ok = mochi.service.call("notifications", "topic/category/set", app, topic, object, category)
    if not ok:
        return a.error.label(404, "errors.not_found")
    a.json({"ok": True})

def action_notifications_topics_delete(a):
    # app="" identifies server-originated topics.
    app = a.input("app", "").strip()
    topic = a.input("topic", "").strip()
    object = a.input("object", "").strip()
    mochi.service.call("notifications", "topic/delete", app, topic, object)
    a.json({"ok": True})

def action_notifications_destinations(a):
    result = mochi.service.call("notifications", "destinations/available")
    a.json(result or {"accounts": [], "feeds": []})
