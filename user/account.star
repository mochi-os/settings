# Mochi settings app: user/account
# Copyright Alistair Cunningham 2025

def action_user_account(a):
    """User account overview - returns identity and sessions"""
    entity_id = a.user.identity.id
    a.json({
        "identity": {
            "entity": entity_id,
            "fingerprint": mochi.entity.fingerprint(entity_id, True),
            "username": a.user.username,
            "name": a.user.identity.name,
        },
        "sessions": mochi.user.session.list(),
    })

def action_user_account_identity(a):
    """Get user identity information"""
    entity_id = a.user.identity.id
    a.json({
        "entity": entity_id,
        "fingerprint": mochi.entity.fingerprint(entity_id, True),
        "username": a.user.username,
        "name": a.user.identity.name,
    })

def action_user_account_sessions(a):
    """List active sessions for current user"""
    a.json({"sessions": mochi.user.session.list()})

def action_user_account_session_revoke(a):
    """Revoke a session"""
    code = a.input("code")
    if not code:
        a.error(400, "Missing session code")
        return

    mochi.user.session.revoke(code)
    a.json({"ok": True})

# ============================================================================
# Login requirements (MFA methods)
# ============================================================================

def action_user_account_methods(a):
    """Get user's required login methods"""
    a.json({"methods": mochi.user.methods.get()})

def action_user_account_methods_set(a):
    """Set user's required login methods"""
    methods = a.input("methods")
    if not methods:
        a.error(400, "Missing methods")
        return

    # Parse comma-separated or JSON array
    if type(methods) == "string":
        methods = [m.strip() for m in methods.split(",") if m.strip()]

    mochi.user.methods.set(methods)
    a.json({"ok": True, "methods": methods})

# ============================================================================
# Passkeys
# ============================================================================

def action_user_account_passkeys(a):
    """List user's passkeys"""
    a.json({"passkeys": mochi.user.passkey.list()})

def action_user_account_passkey_register_begin(a):
    """Begin passkey registration"""
    result = mochi.user.passkey.register.begin()
    a.json(result)

def action_user_account_passkey_register_finish(a):
    """Complete passkey registration"""
    ceremony = a.input("ceremony")
    credential = a.input("credential")
    name = a.input("name") or "Passkey"

    if not ceremony or not credential:
        a.error(400, "Missing ceremony or credential")
        return

    result = mochi.user.passkey.register.finish(ceremony, credential, name)
    a.json(result)

def action_user_account_passkey_rename(a):
    """Rename a passkey"""
    id = a.input("id")
    name = a.input("name")

    if not id or not name:
        a.error(400, "Missing id or name")
        return

    mochi.user.passkey.rename(id, name)
    a.json({"ok": True})

def action_user_account_passkey_delete(a):
    """Delete a passkey"""
    id = a.input("id")
    if not id:
        a.error(400, "Missing passkey id")
        return

    mochi.user.passkey.delete(id)
    a.json({"ok": True})

# ============================================================================
# TOTP (Authenticator app)
# ============================================================================

def action_user_account_totp(a):
    """Get TOTP status"""
    a.json({"enabled": mochi.user.totp.enabled()})

def action_user_account_totp_setup(a):
    """Setup TOTP - returns secret and QR URL"""
    result = mochi.user.totp.setup()
    a.json(result)

def action_user_account_totp_verify(a):
    """Verify TOTP code to complete setup"""
    code = a.input("code")
    if not code:
        a.error(400, "Missing code")
        return

    ok = mochi.user.totp.verify(code)
    a.json({"ok": ok})

def action_user_account_totp_disable(a):
    """Disable TOTP"""
    mochi.user.totp.disable()
    a.json({"ok": True})

# ============================================================================
# Recovery codes
# ============================================================================

def action_user_account_recovery(a):
    """Get recovery code count"""
    a.json({"count": mochi.user.recovery.count()})

def action_user_account_recovery_generate(a):
    """Generate new recovery codes"""
    codes = mochi.user.recovery.generate()
    a.json({"codes": codes})
