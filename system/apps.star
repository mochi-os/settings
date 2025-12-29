# Mochi settings app: system/apps
# Copyright Alistair Cunningham 2025

# Multi-version app management (requires Mochi 0.3+)

def action_system_apps_list(a):
    """List all installed apps with version info"""
    if not require_admin(a):
        return

    # Check server version
    if not version_gte(mochi.server.version(), "0.3"):
        a.error(501, "Multi-version apps requires Mochi 0.3+")
        return

    # Get all installed apps with their versions
    apps = mochi.app.list()
    for app in apps:
        app["versions"] = mochi.app.versions(app["id"])
        app["tracks"] = mochi.app.tracks(app["id"])

    a.json({"apps": apps})

def action_system_apps_get(a):
    """Get details for a specific app"""
    if not require_admin(a):
        return

    if not version_gte(mochi.server.version(), "0.3"):
        a.error(501, "Multi-version apps requires Mochi 0.3+")
        return

    app_id = a.input("app")
    if not app_id:
        a.error(400, "Missing app parameter")
        return

    versions = mochi.app.versions(app_id)
    tracks = mochi.app.tracks(app_id)
    default = mochi.app.version.get(app_id)

    a.json({
        "app": app_id,
        "versions": versions,
        "tracks": tracks,
        "default": default,
    })

def action_system_apps_version_set(a):
    """Set default version or track for an app"""
    if not require_admin(a):
        return

    if not version_gte(mochi.server.version(), "0.3"):
        a.error(501, "Multi-version apps requires Mochi 0.3+")
        return

    app_id = a.input("app")
    version = a.input("version", "")
    track = a.input("track", "")

    if not app_id:
        a.error(400, "Missing app parameter")
        return

    mochi.app.version.set(app_id, version, track)
    a.json({"ok": True})

def action_system_apps_track_set(a):
    """Set a track to point to a specific version"""
    if not require_admin(a):
        return

    if not version_gte(mochi.server.version(), "0.3"):
        a.error(501, "Multi-version apps requires Mochi 0.3+")
        return

    app_id = a.input("app")
    track = a.input("track")
    version = a.input("version")

    if not app_id or not track or not version:
        a.error(400, "Missing app, track, or version parameter")
        return

    mochi.app.track.set(app_id, track, version)
    a.json({"ok": True})

def action_system_apps_cleanup(a):
    """Remove unused app versions"""
    if not require_admin(a):
        return

    if not version_gte(mochi.server.version(), "0.3"):
        a.error(501, "Multi-version apps requires Mochi 0.3+")
        return

    removed = mochi.app.cleanup()
    a.json({"removed": removed})

# Routing management

def action_system_apps_routing(a):
    """Get all system routing (class, service, path)"""
    if not require_admin(a):
        return

    if not version_gte(mochi.server.version(), "0.3"):
        a.error(501, "Multi-version apps requires Mochi 0.3+")
        return

    a.json({
        "classes": getattr(mochi.app, "class").list(),
        "services": mochi.app.service.list(),
        "paths": mochi.app.path.list(),
    })

def action_system_apps_routing_set(a):
    """Set system routing for a class, service, or path"""
    if not require_admin(a):
        return

    if not version_gte(mochi.server.version(), "0.3"):
        a.error(501, "Multi-version apps requires Mochi 0.3+")
        return

    routing_type = a.input("type")  # class, service, or path
    name = a.input("name")
    app_id = a.input("app")

    if not routing_type or not name:
        a.error(400, "Missing type or name parameter")
        return

    if routing_type == "class":
        if app_id:
            getattr(mochi.app, "class").set(name, app_id)
        else:
            getattr(mochi.app, "class").delete(name)
    elif routing_type == "service":
        if app_id:
            mochi.app.service.set(name, app_id)
        else:
            mochi.app.service.delete(name)
    elif routing_type == "path":
        if app_id:
            mochi.app.path.set(name, app_id)
        else:
            mochi.app.path.delete(name)
    else:
        a.error(400, "Invalid routing type")
        return

    a.json({"ok": True})

# Server version check endpoint

def action_system_apps_available(a):
    """Check if multi-version apps feature is available"""
    version = mochi.server.version()
    available = version_gte(version, "0.3")
    a.json({
        "available": available,
        "version": version,
    })
