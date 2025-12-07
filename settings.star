# Mochi settings app
# Copyright Alistair Cunningham 2025

# Access control helper

def require_admin(a):
    """Require administrator, return error if not admin"""
    if a.user.role != "administrator":
        a.error(403, "Administrator required")
        return False
    return True

