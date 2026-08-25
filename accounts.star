# Mochi settings app: Connected accounts
# Copyright © 2026 Mochisoft OÜ
# SPDX-License-Identifier: AGPL-3.0-only
# This file is part of Mochi, licensed under the GNU AGPL v3 with the
# Mochi Application Interface Exception - see license.txt and license-exception.md.
#
# Thin wrappers around mochi.account.* API for the settings app

def action_accounts_providers(a):
    """List available account providers"""
    capability = a.input("capability")
    a.json(mochi.account.providers(capability))

def action_accounts_list(a):
    """List user's connected accounts"""
    capability = a.input("capability")
    a.json(mochi.account.list(capability))

def action_accounts_get(a):
    """Get a single connected account"""
    id = a.input("id")
    if not id:
        a.error.label(400, "errors.id_is_required")
        return
    result = mochi.account.get(id)
    if not result:
        a.error.label(404, "errors.account_not_found")
        return
    a.json(result)

def action_accounts_add(a):
    """Add a new connected account"""
    type = a.input("type")
    if not type:
        a.error.label(400, "errors.type_is_required")
        return
    # Core rejects unknown provider types with a Starlark abort (internal
    # error); validate first and answer a clean 400. Keep the matched row: the
    # capability check below needs it too, and fetching the whole provider
    # table a second time was the only reason this ran two lookups per add.
    provider = None
    if len(type) <= 64:
        for p in mochi.account.providers() or []:
            if p.get("type") == type:
                provider = p
                break
    if not provider:
        return a.error.label(400, "errors.invalid_type")

    # Build fields dict from form inputs. Bound each field like the
    # notifications app's add path - core's own validation accepts up to 1MB.
    fields = {}
    for key in ["label", "address", "token", "api_key", "url", "endpoint", "auth", "p256dh", "secret", "topic", "server"]:
        val = a.input(key)
        if val:
            if len(val) > 4096:
                return a.error.label(400, "errors.value_too_long", maximum=4096)
            fields[key] = val

    # Core refuses a missing required field with an abort (a 500 that mails the
    # operator); providers() declares which fields are required, so answer 400.
    for field in provider.get("fields") or []:
        name = field.get("name")
        shown = field.get("label") or name
        value = fields.get(name)
        if field.get("required") and not value:
            return a.error.label(400, "errors.field_required", field=shown)
        # "email" is core's own email_valid behind mochi.text.valid, so this
        # cannot accept an address the add would then reject, or the reverse.
        if value and field.get("type") == "email" and not mochi.text.valid(value, "email"):
            return a.error.label(400, "errors.field_invalid", field=shown)

    # The browser provider declares no fields at all - its endpoint comes from
    # the JavaScript push subscription rather than a form - so the loop above
    # cannot see it, and core has its own refusal for a missing one.
    if type == "browser" and not fields.get("endpoint"):
        return a.error.label(400, "errors.push_subscription_missing")

    existing = a.input("existing", "1")
    existing = existing == "1" or existing == "true"

    result = mochi.account.add(type, **fields)
    if not result or not result.get("id"):
        a.json(result)
        return

    account_id = result["id"]

    # Non-notify accounts (AI, MCP) have no destination to wire.
    if "notify" not in provider.get("capabilities", []):
        mochi.account.update(account_id, enabled=True)
        a.json(result)
        return

    # Core creates the row enabled and wiring the destination can fail, so
    # disable first and enable only after the wiring succeeded - never leave an
    # enabled account that delivers nothing.
    mochi.account.update(account_id, enabled=False)
    if not existing:
        a.json(result)
        return

    if not mochi.service.call("notifications", "destinations/add", "account", account_id):
        # Remove through core, not the notifications service: the wiring just
        # failed, so there are no destination rows and the service may be down.
        mochi.account.remove(account_id)
        return a.error.label(502, "errors.destination_not_wired")
    mochi.account.update(account_id, enabled=True)

    a.json(result)

def action_accounts_update(a):
    """Update a connected account"""
    id = a.input("id")
    if not id:
        a.error.label(400, "errors.id_is_required")
        return

    # Build fields dict from form inputs
    fields = {}
    label = a.input("label")
    if label != None:
        if len(label) > 4096:
            a.error.label(400, "errors.value_too_long", maximum=4096)
            return
        fields["label"] = label

    enabled = a.input("enabled")
    if enabled:
        fields["enabled"] = enabled == "true" or enabled == "1"

    model = a.input("model")
    if model != None:
        if len(model) > 4096:
            a.error.label(400, "errors.value_too_long", maximum=4096)
            return
        fields["model"] = model

    result = mochi.account.update(id, **fields)
    a.json(result)

def action_accounts_default(a):
    """Set or clear the default account for a capability type"""
    id = a.input("account")
    if not id:
        a.error.label(400, "errors.account_is_required")
        return
    # An empty string clears the default; anything else has to name a
    # capability some provider actually declares. This column is read back to
    # pick the account for a capability, so an unrecognised value stores a
    # default that nothing will ever match and quietly loses the setting.
    type = a.input("type", "")
    if type:
        capabilities = []
        for p in mochi.account.providers() or []:
            for c in p.get("capabilities", []):
                if c not in capabilities:
                    capabilities.append(c)
        if type not in capabilities:
            a.error.label(400, "errors.invalid_value_for_key", key="type")
            return
    if not mochi.account.get(id):
        a.error.label(404, "errors.account_not_found")
        return
    mochi.account.update(id, default=type)
    a.json({"ok": True})

def action_accounts_remove(a):
    """Remove a connected account. Routed through the notifications service
    so the account's destination rows and queued push payloads are cleaned
    with it - a bare mochi.account.remove left ghost destinations in every
    category list and stale rows in the push queue."""
    id = a.input("id")
    if not id:
        a.error.label(400, "errors.id_is_required")
        return

    result = mochi.service.call("notifications", "accounts/remove", id=id)
    a.json(result)

def action_accounts_verify(a):
    """Verify an account or resend verification code"""
    id = a.input("id")
    if not id:
        a.error.label(400, "errors.id_is_required")
        return

    code = a.input("code")
    result = mochi.account.verify(id, code)
    a.json(result)

def action_accounts_vapid(a):
    """Return VAPID public key for browser push subscription"""
    key = mochi.webpush.key()
    if not key:
        return a.error.label(503, "errors.push_notifications_not_available")
    a.json({"key": key})

def action_accounts_test(a):
    """Test a connected account"""
    id = a.input("id")
    if not id:
        a.error.label(400, "errors.id_is_required")
        return

    result = mochi.account.test(id)
    a.json(result)
