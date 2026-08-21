# Mochi settings app
# Copyright © 2026 Mochisoft OÜ
# SPDX-License-Identifier: AGPL-3.0-only
# This file is part of Mochi, licensed under the GNU AGPL v3 with the
# Mochi Application Interface Exception - see license.txt and license-exception.md.

# decimal(value) -> bool: whether value is a non-empty ASCII decimal string.
# This is what .isdigit() was reached for, but isdigit() also accepts Unicode
# digit forms (Arabic-Indic "٣", Devanagari "३") that int() rejects,
# which aborts the action as a 500 instead of taking the guard's else branch.
def decimal(value):
    if not value:
        return False
    for c in value.elems():
        if c not in "0123456789":
            return False
    return True

# Access control helper
def require_admin(a):
    """Require administrator, return error if not admin"""
    if a.user.role != "administrator":
        a.error.label(403, "errors.administrator_required")
        return False
    return True

def parse_int(value, default):
    """Parse an input into an int; default when missing or not an integer."""
    s = value or ""
    digits = s[1:] if s.startswith("-") else s
    if digits and decimal(digits):
        return int(s)
    return default
