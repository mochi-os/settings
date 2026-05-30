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

def action_user_account_code(a):
    """Email the user a one-time step-up code.

    A second factor before key-bearing actions - data export and
    approving replication - any of which would otherwise let a valid
    session alone move the user's private keys off the server. Reuses the
    login code; the email also alerts the user that such an action was
    attempted.
    """
    mochi.user.code.send()
    a.json({"ok": True})

def action_user_account_code_verify(a):
    """Verify an emailed code as the email factor of a step-up re-auth.

    Returns {token} once every required factor is satisfied, {remaining}
    if more are still needed, or a code error if it is wrong/expired.
    """
    result = mochi.user.code.verify(a.input("code", ""))
    if result == None:
        a.error.label(400, "errors.code_invalid")
        return
    a.json(result)

def action_user_account_export(a):
    """Build a backup bundle and return its filename.

    Every export is a complete, restorable backup: the user's data plus
    their passphrase-encrypted private keys. Because the bundle can
    extract the account's identity keys, it requires step-up
    re-authentication: the user re-verifies their login factor(s) to earn
    a proof token, supplied here alongside the passphrase. The bundle is
    streamed separately by export/download so the browser can save
    multi-GB files straight to disk rather than buffering them.
    """
    if not mochi.user.session.reauthenticate(a.input("token", "")):
        a.error.label(400, "errors.reauthentication_required")
        return
    passphrase = a.input("passphrase", "")
    if not passphrase:
        a.error.label(400, "errors.passphrase_required")
        return

    path = mochi.user.export(passphrase)
    a.json({"filename": path.split("/")[-1]})

def action_user_account_export_download(a):
    """Stream a previously built export bundle to the browser.

    Public so a top-window navigation can reach it: that navigation
    carries the session cookie but no app token. The bundle is served
    only from the requesting user's own files (owner follows the
    session), so a logged-in session is still required.
    """
    if a.user == None:
        a.error.label(401, "errors.authentication_required")
        return
    name = a.input("file", "")
    if not name or "/" in name or "\\" in name or ".." in name:
        a.error.label(400, "errors.invalid_file")
        return
    # The browser supplies a friendly download name in the user's local
    # time (the on-disk name is UTC for stability). Fall back to the
    # on-disk name if it's missing or unsafe to place in a header.
    download = a.input("name", "")
    if (not download or not download.endswith(".zip") or len(download) > 128 or
            "/" in download or "\\" in download or '"' in download or
            "\n" in download or "\r" in download):
        download = name
    a.header("Content-Type", "application/zip")
    a.header("Content-Disposition", 'attachment; filename="' + download + '"')
    # a.write.file streams synchronously, so by the time it returns the
    # bundle has been served; delete it so the (multi-GB) backup with
    # encrypted keys doesn't linger in the user's files.
    a.write.file("mochi-export/" + name)
    mochi.file.delete("mochi-export/" + name)

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
    """Set user's required login methods.

    Changing how you log in is gated on step-up re-authentication so a
    stolen session can't weaken the account's factors.
    """
    if not mochi.user.session.reauthenticate(a.input("token", "")):
        a.error.label(400, "errors.reauthentication_required")
        return
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
    """Complete passkey registration.

    Adding a login credential is gated on step-up re-authentication so a
    stolen session can't plant a backdoor passkey.
    """
    if not mochi.user.session.reauthenticate(a.input("token", "")):
        a.error.label(400, "errors.reauthentication_required")
        return
    ceremony = a.input("ceremony")
    credential = a.input("credential")
    name = a.input("name") or "Passkey"

    if not ceremony or not credential:
        a.error.label(400, "errors.missing_ceremony_or_credential")
        return

    result = mochi.user.passkey.register.finish(ceremony, credential, name)
    a.json(result)

def action_user_account_passkey_verify_begin(a):
    """Begin a step-up passkey assertion (re-verify an existing passkey)."""
    a.json(mochi.user.passkey.verify.begin())

def action_user_account_passkey_verify_finish(a):
    """Complete a step-up passkey assertion.

    Returns the re-authentication result ({token} or {remaining}) on
    success, or a re-authentication error if the assertion fails.
    """
    ceremony = a.input("ceremony")
    assertion = a.input("assertion")
    if not ceremony or not assertion:
        a.error.label(400, "errors.missing_ceremony_or_credential")
        return
    result = mochi.user.passkey.verify.finish(ceremony, assertion)
    if result == None:
        a.error.label(400, "errors.reauthentication_required")
        return
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
    """Setup TOTP - returns secret and QR URL.

    Gated on step-up re-authentication: adding a factor is a security
    change a stolen session must not be able to make.
    """
    if not mochi.user.session.reauthenticate(a.input("token", "")):
        a.error.label(400, "errors.reauthentication_required")
        return
    result = mochi.user.totp.setup()
    a.json(result)

def action_user_account_totp_verify(a):
    """Verify a TOTP code.

    During setup (TOTP not yet enabled) this confirms enrolment and
    returns {ok}. When TOTP is already enabled it is a step-up re-verify,
    returning the re-authentication result ({token} or {remaining}); a bad
    code there yields a re-authentication error.
    """
    code = a.input("code")
    if not code:
        a.error.label(400, "errors.missing_code")
        return

    result = mochi.user.totp.verify(code)
    if type(result) == "dict":
        a.json(result)
    elif result == None:
        a.error.label(400, "errors.reauthentication_required")
    else:
        a.json({"ok": result})

def action_user_account_totp_disable(a):
    """Disable TOTP.

    Gated on step-up re-authentication: removing a factor must re-verify
    the current ones first.
    """
    if not mochi.user.session.reauthenticate(a.input("token", "")):
        a.error.label(400, "errors.reauthentication_required")
        return
    mochi.user.totp.disable()
    a.json({"ok": True})

# ============================================================================
# Recovery codes
# ============================================================================

def action_user_account_recovery(a):
    """Get recovery code count"""
    a.json({"count": mochi.user.recovery.count()})

def action_user_account_recovery_generate(a):
    """Generate new recovery codes.

    Gated on step-up re-authentication: recovery codes are a persistent
    re-entry path a stolen session must not be able to mint.
    """
    if not mochi.user.session.reauthenticate(a.input("token", "")):
        a.error.label(400, "errors.reauthentication_required")
        return
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

def action_user_account_oauth_verify_begin(a):
    """Begin a popup OAuth step-up re-authentication.

    challenge is base64url(sha256(verifier)) the client holds; the proof is
    retrieved afterwards with the finish action using the verifier.
    """
    provider = a.input("provider")
    challenge = a.input("challenge")
    if not provider or not challenge:
        a.error.label(400, "errors.missing_provider")
        return
    a.json(mochi.user.oauth.verify.begin(provider, challenge))

def action_user_account_oauth_verify_finish(a):
    """Retrieve the proof the OAuth popup produced, for polling.

    Returns the re-authentication result ({token} or {remaining}) once the
    popup callback has stored it, or {} while it is not yet available - the
    client polls until the popup completes or is cancelled.
    """
    verifier = a.input("verifier")
    if not verifier:
        a.json({})
        return
    result = mochi.user.oauth.verify.finish(verifier)
    if result == None:
        a.json({})
        return
    a.json(result)

# ============================================================================
# API Tokens
# ============================================================================

def action_user_account_tokens(a):
    """List user's API tokens"""
    a.json({"tokens": mochi.token.list()})

def action_user_account_token_create(a):
    """Create a new API token.

    Gated on step-up re-authentication: an API token is a long-lived
    bearer credential that survives session revocation, so a stolen
    session must not be able to mint one.
    """
    if not mochi.user.session.reauthenticate(a.input("token", "")):
        a.error.label(400, "errors.reauthentication_required")
        return
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
