# Mochi settings app: system/update
# Copyright © 2026 Mochisoft OÜ
# SPDX-License-Identifier: AGPL-3.0-only
# This file is part of Mochi, licensed under the GNU AGPL v3 with the
# Mochi Application Interface Exception - see license.txt and license-exception.md.

def action_system_update(a):
    """Server upgrade information; install=true triggers an unattended
    self-install of the latest version (Windows only)."""
    if not require_admin(a):
        return
    if a.input("install") == "true":
        result = mochi.server.update.install()
        a.json({"installed": result})
        return
    a.json(mochi.server.update.info())
