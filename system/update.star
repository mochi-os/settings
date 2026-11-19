# Mochi settings app: system/update
# Copyright © 2026 Mochisoft OÜ
# SPDX-License-Identifier: AGPL-3.0-only
# This file is part of Mochi, licensed under the GNU AGPL v3 with the
# Mochi Application Interface Exception - see license.txt and license-exception.md.

def action_system_update(a):
    """Server upgrade information. A read: a GET may run it."""
    if not require_admin(a):
        return
    a.json(mochi.server.update.info())

def action_system_update_install(a):
    """An unattended self-install of the latest version (Windows only), behind
    a fresh reauthentication. Its own action, unmarked as a read, so only a
    POST reaches it."""
    if not require_admin(a):
        return
    if not mochi.user.session.reauthenticate(a.input("token", "")):
        a.error.label(400, "errors.reauthentication_required")
        return
    a.json({"installed": mochi.server.update.install()})
