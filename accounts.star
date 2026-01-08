# Mochi settings app: Connected accounts
# Copyright Alistair Cunningham 2025
#
# Thin wrappers around mochi.account.* API for the settings app

def action_accounts_providers(a):
    """List available account providers"""
    capability = a.input("capability")
    return {"data": mochi.account.providers(capability)}

def action_accounts_list(a):
    """List user's connected accounts"""
    capability = a.input("capability")
    return {"data": mochi.account.list(capability)}

def action_accounts_get(a):
    """Get a single connected account"""
    id = a.input("id")
    if not id:
        a.error(400, "id is required")
        return
    result = mochi.account.get(int(id))
    return {"data": result}

def action_accounts_add(a):
    """Add a new connected account"""
    type = a.input("type")
    if not type:
        a.error(400, "type is required")
        return

    # Build fields dict from form inputs
    fields = {}
    for key in ["label", "address", "token", "api_key", "url", "endpoint", "auth", "p256dh"]:
        val = a.input(key)
        if val:
            fields[key] = val

    result = mochi.account.add(type, fields)
    return {"data": result}

def action_accounts_update(a):
    """Update a connected account"""
    id = a.input("id")
    if not id:
        a.error(400, "id is required")
        return

    # Build fields dict from form inputs
    fields = {}
    label = a.input("label")
    if label != None:
        fields["label"] = label

    result = mochi.account.update(int(id), fields)
    return {"data": result}

def action_accounts_remove(a):
    """Remove a connected account"""
    id = a.input("id")
    if not id:
        a.error(400, "id is required")
        return

    result = mochi.account.remove(int(id))
    return {"data": result}

def action_accounts_verify(a):
    """Verify an account or resend verification code"""
    id = a.input("id")
    if not id:
        a.error(400, "id is required")
        return

    code = a.input("code")
    result = mochi.account.verify(int(id), code)
    return {"data": result}
