# Mochi settings app
# Copyright Alistair Cunningham 2025-2026

# Access control helper

def require_admin(a):
    """Require administrator, return error if not admin"""
    if a.user.role != "administrator":
        a.error_label(403, "errors.administrator_required")
        return False
    return True
