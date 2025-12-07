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
