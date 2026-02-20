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
    for key in ["label", "address", "token", "api_key", "url", "endpoint", "auth", "p256dh", "secret", "topic", "server"]:
        val = a.input(key)
        if val:
            fields[key] = val

    add_to_existing = a.input("add_to_existing", "1")
    add_to_existing = add_to_existing == "1" or add_to_existing == "true"

    result = mochi.account.add(type, **fields)

    # For notify accounts, set enabled based on add_to_existing toggle
    # and optionally add to all existing notification subscriptions.
    # Non-notify accounts (AI, MCP) are always enabled.
    if result and result.get("id"):
        account_id = result["id"]
        providers = mochi.account.providers()
        provider = [p for p in providers if p["type"] == type]
        is_notify = provider and "notify" in provider[0].get("capabilities", [])
        if is_notify:
            mochi.account.update(account_id, enabled=add_to_existing)
            if add_to_existing:
                mochi.service.call("notifications", "add_destination_to_all", "account", account_id)
        else:
            mochi.account.update(account_id, enabled=True)

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

    enabled = a.input("enabled")
    if enabled:
        fields["enabled"] = enabled == "true" or enabled == "1"

    result = mochi.account.update(int(id), **fields)
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

def action_accounts_vapid(a):
    """Return VAPID public key for browser push subscription"""
    key = mochi.webpush.key()
    if not key:
        return a.error(503, "Push notifications not available")
    return {"data": {"key": key}}

def action_accounts_test(a):
    """Test a connected account"""
    id = a.input("id")
    if not id:
        a.error(400, "id is required")
        return

    result = mochi.account.test(int(id))
    return {"data": result}
