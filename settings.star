# Mochi settings app
# Copyright © 2026 Mochi OÜ
# SPDX-License-Identifier: AGPL-3.0-only
# This file is part of Mochi, licensed under the GNU AGPL v3 with the
# Mochi Application Interface Exception - see license.txt and license-exception.md.

# Access control helper

def require_admin(a):
    """Require administrator, return error if not admin"""
    if a.user.role != "administrator":
        a.error.label(403, "errors.administrator_required")
        return False
    return True

def parse_int(value, default):
    """Parse a (possibly None/empty/non-numeric) input into an int.

    Returns `default` when the value is missing or not a valid integer, so
    callers don't crash on non-numeric input. Accepts an optional leading '-'.
    """
    s = value or ""
    digits = s[1:] if s.startswith("-") else s
    if digits and digits.isdigit():
        return int(s)
    return default
