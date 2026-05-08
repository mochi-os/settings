# Mochi settings app: system/update
# Copyright Alistair Cunningham 2025-2026

def action_system_update(a):
    """Server upgrade information for the system status page.

    POST with input `install=true`: trigger an unattended self-install of
    the latest known version (Windows only) and return the post-call info.
    Otherwise: just return the current update info dict.
    """
    if not require_admin(a):
        return
    if a.input("install") == "true":
        result = mochi.server.update.install()
        a.json({"installed": result})
        return
    a.json(mochi.server.update.info())
