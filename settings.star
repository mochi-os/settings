# Mochi settings app
# Copyright Alistair Cunningham 2025

# Access control helpers

def require_user(a):
    """Require authenticated user, return error if not logged in"""
    if a.user == None:
        a.error(401, "Authentication required")
        return False
    return True

def require_admin(a):
    """Require administrator, return error if not admin"""
    if a.user == None:
        a.error(401, "Authentication required")
        return False
    if a.user.role != "administrator":
        a.error(403, "Administrator required")
        return False
    return True

