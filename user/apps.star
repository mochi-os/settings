# Mochi settings app: user/apps
# Copyright Alistair Cunningham 2025

# User app preferences - version selection and routing overrides

def action_user_apps_data(a):
    """Get user app preferences data"""
    if not version_gte(mochi.server.version(), "0.3"):
        a.error(501, "App preferences requires Mochi 0.3+")
        return

    # Get all installed apps with their versions
    apps = mochi.app.list()
    for app in apps:
        app["versions"] = mochi.app.versions(app["id"])
        app["tracks"] = mochi.app.tracks(app["id"])

    # Get user's version preferences
    versions = {}
    for app in apps:
        v = a.user.app.version.get(app["id"])
        if v:
            versions[app["id"]] = v

    # Get user's routing overrides
    # Note: 'class' is a reserved keyword, use getattr()
    classes = getattr(a.user.app, "class").list()
    services = a.user.app.service.list()
    paths = a.user.app.path.list()

    a.json({
        "apps": apps,
        "versions": versions,
        "classes": classes,
        "services": services,
        "paths": paths,
    })

def action_user_apps_version_set(a):
    """Set user's preferred version or track for an app"""
    if not version_gte(mochi.server.version(), "0.3"):
        a.error(501, "App preferences requires Mochi 0.3+")
        return

    app_id = a.input("app")
    version = a.input("version", "")
    track = a.input("track", "")

    if not app_id:
        a.error(400, "Missing app parameter")
        return

    # Empty version and track clears the preference
    a.user.app.version.set(app_id, version, track)
    a.json({"ok": True})

def action_user_apps_routing_set(a):
    """Set user's routing override for a class, service, or path"""
    if not version_gte(mochi.server.version(), "0.3"):
        a.error(501, "App preferences requires Mochi 0.3+")
        return

    routing_type = a.input("type")  # class, service, or path
    name = a.input("name")
    app_id = a.input("app", "")

    if not routing_type or not name:
        a.error(400, "Missing type or name parameter")
        return

    if routing_type == "class":
        if app_id:
            getattr(a.user.app, "class").set(name, app_id)
        else:
            getattr(a.user.app, "class").delete(name)
    elif routing_type == "service":
        if app_id:
            a.user.app.service.set(name, app_id)
        else:
            a.user.app.service.delete(name)
    elif routing_type == "path":
        if app_id:
            a.user.app.path.set(name, app_id)
        else:
            a.user.app.path.delete(name)
    else:
        a.error(400, "Invalid routing type")
        return

    a.json({"ok": True})

def action_user_apps_reset(a):
    """Reset all user app preferences to system defaults"""
    if not version_gte(mochi.server.version(), "0.3"):
        a.error(501, "App preferences requires Mochi 0.3+")
        return

    # Clear all version preferences
    apps = mochi.app.list()
    for app in apps:
        a.user.app.version.delete(app["id"])

    # Clear all routing overrides
    for cls in getattr(a.user.app, "class").list():
        getattr(a.user.app, "class").delete(cls)
    for svc in a.user.app.service.list():
        a.user.app.service.delete(svc)
    for path in a.user.app.path.list():
        a.user.app.path.delete(path)

    a.json({"ok": True})
