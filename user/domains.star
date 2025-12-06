# Mochi settings app: user/domains
# Copyright Alistair Cunningham 2025

def action_user_domains(a):
    """User domains overview"""
    if not require_user(a):
        return
    a.error(501, "Not implemented")

def action_user_domains_list(a):
    """List user's domains"""
    if not require_user(a):
        return
    a.error(501, "Not implemented")

def action_user_domains_register(a):
    """Register a new domain"""
    if not require_user(a):
        return
    a.error(501, "Not implemented")

def action_user_domains_delete(a):
    """Delete a domain"""
    if not require_user(a):
        return
    a.error(501, "Not implemented")

def action_user_domains_routes(a):
    """List routes on user's domains"""
    if not require_user(a):
        return
    a.error(501, "Not implemented")

def action_user_domains_route_set(a):
    """Add or update a route"""
    if not require_user(a):
        return
    a.error(501, "Not implemented")

def action_user_domains_route_delete(a):
    """Delete a route"""
    if not require_user(a):
        return
    a.error(501, "Not implemented")
