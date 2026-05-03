# Mochi settings app: user/account
# Copyright Alistair Cunningham 2025-2026

def action_user_account(a):
    """User account overview - returns identity and sessions"""
    entity_id = a.user.identity.id
    fp = mochi.entity.fingerprint(entity_id)
    a.json({
        "identity": {
            "entity": entity_id,
            "fingerprint": fp[:3] + "-" + fp[3:6] + "-" + fp[6:],
            "username": a.user.username,
            "name": a.user.identity.name,
            "privacy": a.user.identity.privacy,
        },
        "role": a.user.role,
        "sessions": mochi.user.session.list(),
    })

def action_user_account_identity(a):
    """Get user identity information"""
    entity_id = a.user.identity.id
    fp = mochi.entity.fingerprint(entity_id)
    a.json({
        "entity": entity_id,
        "fingerprint": fp[:3] + "-" + fp[3:6] + "-" + fp[6:],
        "username": a.user.username,
        "name": a.user.identity.name,
        "privacy": a.user.identity.privacy,
    })

def action_user_account_identity_update(a):
    """Update the current user's identity (name, privacy)"""
    name = a.input("name")
    privacy = a.input("privacy")

    if name == None and privacy == None:
        a.error.label(400, "errors.nothing_to_update")
        return

    kwargs = {}
    if name != None:
        name = name.strip()
        if not name:
            a.error.label(400, "errors.name_cannot_be_empty")
            return
        kwargs["name"] = name
    if privacy != None:
        if privacy != "public" and privacy != "private":
            a.error.label(400, "errors.invalid_privacy")
            return
        kwargs["privacy"] = privacy

    mochi.user.identity.update(**kwargs)
    a.json({"ok": True})

def action_user_account_sessions(a):
    """List active sessions for current user"""
    a.json({"sessions": mochi.user.session.list()})

def action_user_account_session_revoke(a):
    """Revoke a session"""
    id = a.input("id")
    if not id:
        a.error.label(400, "errors.missing_session_id")
        return

    mochi.user.session.revoke(a.user.id, id)
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
        a.error.label(400, "errors.missing_methods")
        return

    # Parse comma-separated or JSON array
    if type(methods) == "string":
        # Handle JSON array format: ["email","passkey"]
        if methods.startswith("[") and methods.endswith("]"):
            # Remove brackets and parse as comma-separated, stripping quotes
            inner = methods[1:-1]
            methods = []
            for m in inner.split(","):
                m = m.strip().strip('"').strip("'")
                if m:
                    methods.append(m)
        else:
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
        a.error.label(400, "errors.missing_ceremony_or_credential")
        return

    result = mochi.user.passkey.register.finish(ceremony, credential, name)
    a.json(result)

def action_user_account_passkey_rename(a):
    """Rename a passkey"""
    id = a.input("id")
    name = a.input("name")

    if not id or not name:
        a.error.label(400, "errors.missing_id_or_name")
        return

    mochi.user.passkey.rename(id, name)
    a.json({"ok": True})

def action_user_account_passkey_delete(a):
    """Delete a passkey"""
    id = a.input("id")
    if not id:
        a.error.label(400, "errors.missing_passkey_id")
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
        a.error.label(400, "errors.missing_code")
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

# ============================================================================
# OAuth (third-party sign-in linking)
# ============================================================================

def action_user_account_oauth(a):
    """List OAuth providers linked to the current user"""
    a.json({"identities": mochi.user.oauth.list()})

def action_user_account_oauth_unlink(a):
    """Unlink an OAuth provider from the current user"""
    provider = a.input("provider")
    if not provider:
        a.error.label(400, "errors.missing_provider")
        return
    mochi.user.oauth.unlink(provider)
    a.json({"ok": True})

# ============================================================================
# API Tokens
# ============================================================================

def action_user_account_tokens(a):
    """List user's API tokens"""
    a.json({"tokens": mochi.token.list()})

def action_user_account_token_create(a):
    """Create a new API token"""
    name = a.input("name")
    if not name:
        a.error.label(400, "errors.missing_token_name")
        return

    scopes = a.input("scopes") or []
    if type(scopes) == "string":
        if scopes.startswith("[") and scopes.endswith("]"):
            inner = scopes[1:-1]
            scopes = []
            for s in inner.split(","):
                s = s.strip().strip('"').strip("'")
                if s:
                    scopes.append(s)
        elif scopes:
            scopes = [s.strip() for s in scopes.split(",") if s.strip()]
        else:
            scopes = []

    expires = a.input("expires") or 0
    if type(expires) == "string":
        expires = int(expires) if expires else 0

    token = mochi.token.create(name, scopes, expires)
    if not token:
        a.error.label(500, "errors.failed_to_create_token")
        return

    a.json({"data": {"token": token, "name": name}})

def action_user_account_token_delete(a):
    """Delete an API token"""
    hash = a.input("hash")
    if not hash:
        a.error.label(400, "errors.missing_token_hash")
        return

    ok = mochi.token.delete(hash)
    a.json({"ok": ok})
