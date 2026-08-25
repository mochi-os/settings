# Mochi settings app: user/account
# Copyright © 2026 Mochisoft OÜ
# SPDX-License-Identifier: AGPL-3.0-only
# This file is part of Mochi, licensed under the GNU AGPL v3 with the
# Mochi Application Interface Exception - see license.txt and license-exception.md.

def user_identity(a):
    """Build the current user's identity payload, shared by the account
    overview and the identity endpoint."""
    entity_id = a.user.identity.id
    fp = mochi.entity.fingerprint(entity_id)
    return {
        "entity": entity_id,
        "fingerprint": fp[:3] + "-" + fp[3:6] + "-" + fp[6:],
        "username": a.user.username,
        "name": a.user.identity.name,
        "privacy": a.user.identity.privacy,
    }

def action_user_account(a):
    """User account overview - returns identity and sessions"""
    a.json({
        "identity": user_identity(a),
        "role": a.user.role,
        "sessions": mochi.user.session.list(),
    })

def action_user_account_code(a):
    """Email the user a one-time step-up code (reuses the login code); the
    email also alerts the user that a key-bearing action was attempted."""
    reason = mochi.user.code.send()
    if reason == "too_many_codes":
        a.error.label(429, "errors.too_many_codes")
        return
    if reason:
        a.error.label(400, "errors.unable_to_send_code")
        return
    a.json({"ok": True})

def action_user_account_code_verify(a):
    """Verify an emailed step-up code. Returns {token} when every required
    factor is satisfied, {remaining} when more are needed."""
    result = mochi.user.code.verify(a.input("code", ""))
    if result == None:
        a.error.label(400, "errors.code_invalid")
        return
    a.json(result)

def action_user_account_export(a):
    """Build a backup bundle (data plus passphrase-encrypted private keys) and
    return its filename. Step-up gated because it can extract identity keys;
    export/download streams it so multi-GB files go straight to disk."""
    if not mochi.user.session.reauthenticate(a.input("token", "")):
        a.error.label(400, "errors.reauthentication_required")
        return
    passphrase = a.input("passphrase", "")
    if not passphrase:
        a.error.label(400, "errors.passphrase_required")
        return

    path = mochi.user.export(passphrase)
    a.json({"filename": path.split("/")[-1]})

def action_user_account_close(a):
    """Close the current user's account: step-up gated soft delete after a grace
    period, every session revoked. Returns the purge timestamp (unix seconds).
    Administrators are refused server-side."""
    if not mochi.user.session.reauthenticate(a.input("token", "")):
        a.error.label(400, "errors.reauthentication_required")
        return

    purge = mochi.user.close()
    a.json({"purge": purge})

def action_user_account_export_download(a):
    """Stream a built export bundle. Public so a top-window navigation (session
    cookie, no app token) can reach it; served only from the session user's
    own files."""
    if a.user == None:
        a.error.label(401, "errors.authentication_required")
        return
    # Serving consumes the bundle and the session cookie is SameSite=Lax, so a
    # cross-site navigation could destroy a user's export. Browsers without the
    # header are allowed through: the risk is loss of a rebuildable bundle.
    if a.header("Sec-Fetch-Site") == "cross-site":
        a.error.label(404, "errors.not_found")
        return
    name = a.input("file", "")
    # Allowlist: export bundles are named mochi-export-<stamp>-<fingerprint>-<suffix>.zip,
    # so only letters, digits, dot, hyphen and underscore are ever valid. Validate
    # against that set (and reject any "..") rather than blocklisting known-bad chars.
    allowed = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-_"
    valid = name.endswith(".zip") and ".." not in name
    if valid:
        for c in name.elems():
            if c not in allowed:
                valid = False
                break
    if not valid:
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
    a.json(user_identity(a))

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
        a.error.label(400, "errors.missing_session")
        return

    # Core aborts on a session id that matches nothing, which the server
    # reports as a 500. The ids it accepts are exactly the ones it lists.
    found = False
    for s in mochi.user.session.list() or []:
        if s.get("id") == id:
            found = True
            break
    if not found:
        a.error.label(404, "errors.not_found")
        return

    mochi.user.session.revoke(a.user.id, id)
    a.json({"ok": True})

# ============================================================================
# Login requirements (MFA methods)
# ============================================================================

def action_user_account_methods(a):
    """Get the user's per-method login state (disabled/allowed/required)."""
    a.json({"methods": mochi.user.methods.states()})

def action_user_account_methods_set(a):
    """Set one login method's state (disabled/allowed/required). Step-up gated."""
    if not mochi.user.session.reauthenticate(a.input("token", "")):
        a.error.label(400, "errors.reauthentication_required")
        return
    method = a.input("method")
    state = a.input("state")
    if not method or not state:
        a.error.label(400, "errors.missing_methods")
        return

    error = mochi.user.methods.configure(method, state)
    if error == "last":
        a.error.label(400, "errors.method_last_factor")
        return
    if error == "blocked":
        a.error.label(400, "errors.method_blocked")
        return
    if error == "credential":
        a.error.label(400, "errors.method_not_configured")
        return
    if error:
        a.error.label(400, "errors.method_invalid")
        return

    a.json({"ok": True})

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
    """Complete passkey registration. Step-up gated."""
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
    """Complete a step-up passkey assertion; returns {token} or {remaining}."""
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

# Whether the caller holds a passkey with this id. mochi.user.passkey.list is
# already scoped to the caller, so a hit is both existence and ownership.
def passkey_owned(id):
    for key in mochi.user.passkey.list() or []:
        if key["id"] == id:
            return True
    return False


def action_user_account_passkey_rename(a):
    """Rename a passkey"""
    id = a.input("id")
    name = a.input("name")

    if not id or not name:
        a.error.label(400, "errors.missing_id_or_name")
        return
    if len(name) > 255:
        a.error.label(400, "errors.value_too_long", maximum=255)
        return
    # Core aborts on an unknown or malformed id, which reaches the user as a
    # bare 500.
    if not passkey_owned(id):
        a.error.label(404, "errors.not_found")
        return

    mochi.user.passkey.rename(id, name)
    a.json({"ok": True})

def action_user_account_passkey_delete(a):
    """Delete a passkey. Step-up gated."""
    if not mochi.user.session.reauthenticate(a.input("token", "")):
        a.error.label(400, "errors.reauthentication_required")
        return
    id = a.input("id")
    if not id:
        a.error.label(400, "errors.missing_passkey_id")
        return
    if not passkey_owned(id):
        a.error.label(404, "errors.not_found")
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
    """Setup TOTP - returns secret and QR URL. Step-up gated."""
    if not mochi.user.session.reauthenticate(a.input("token", "")):
        a.error.label(400, "errors.reauthentication_required")
        return
    result = mochi.user.totp.setup()
    a.json(result)

def action_user_account_totp_verify(a):
    """Verify a TOTP code. During setup this confirms enrolment and returns
    {ok}; once enabled it is a step-up re-verify returning {token} or {remaining}."""
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
    """Disable TOTP. Step-up gated."""
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
    """Generate new recovery codes. Step-up gated."""
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
    """Unlink an OAuth provider from the current user. Step-up gated."""
    if not mochi.user.session.reauthenticate(a.input("token", "")):
        a.error.label(400, "errors.reauthentication_required")
        return
    provider = a.input("provider")
    if not provider:
        a.error.label(400, "errors.missing_provider")
        return
    mochi.user.oauth.unlink(provider)
    a.json({"ok": True})

def action_user_account_oauth_verify_begin(a):
    """Begin a popup OAuth step-up. challenge = base64url(sha256(verifier));
    the client keeps the verifier and presents it to the finish action."""
    provider = a.input("provider")
    challenge = a.input("challenge")
    if not provider or not challenge:
        a.error.label(400, "errors.missing_provider")
        return
    a.json(mochi.user.oauth.verify.begin(provider, challenge))

def action_user_account_oauth_verify_finish(a):
    """Poll for the proof the OAuth popup produced: {token} or {remaining}
    once the callback has stored it, {} while not yet available."""
    verifier = a.input("verifier")
    if not verifier:
        a.json({})
        return
    result = mochi.user.oauth.verify.finish(verifier)
    if result == None:
        a.json({})
        return
    a.json(result)

