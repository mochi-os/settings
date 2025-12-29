# Mochi settings app
# Copyright Alistair Cunningham 2025

# Access control helper

def require_admin(a):
    """Require administrator, return error if not admin"""
    if a.user.role != "administrator":
        a.error(403, "Administrator required")
        return False
    return True

# Version comparison helper

def version_gte(v, target):
    """Check if version v >= target. Handles both 0.3.0 and 1.0 formats."""
    v_parts = [int(p) for p in v.split(".")]
    t_parts = [int(p) for p in target.split(".")]
    # Pad shorter list with zeros for comparison
    while len(v_parts) < len(t_parts):
        v_parts.append(0)
    while len(t_parts) < len(v_parts):
        t_parts.append(0)
    # Compare element by element
    for i in range(len(v_parts)):
        if v_parts[i] > t_parts[i]:
            return True
        if v_parts[i] < t_parts[i]:
            return False
    return True  # Equal
