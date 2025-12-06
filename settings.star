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

# Index action - redirect to user/account

def action_index(a):
    """Settings index - returns available categories"""
    if not require_user(a):
        return

    categories = [
        {"scope": "user", "category": "account", "path": "user/account"},
        {"scope": "user", "category": "preferences", "path": "user/preferences"},
        {"scope": "user", "category": "domains", "path": "user/domains"},
    ]

    if a.user.role == "administrator":
        categories.extend([
            {"scope": "system", "category": "settings", "path": "system/settings"},
            {"scope": "system", "category": "users", "path": "system/users"},
            {"scope": "system", "category": "domains", "path": "system/domains"},
        ])

    a.json({"categories": categories})
