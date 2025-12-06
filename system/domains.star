# Mochi settings app: system/domains
# Copyright Alistair Cunningham 2025

def action_system_domains(a):
    """System domains overview"""
    if not require_admin(a):
        return
    a.error(501, "Not implemented")

def action_system_domains_list(a):
    """List all domains"""
    if not require_admin(a):
        return
    a.error(501, "Not implemented")

def action_system_domains_get(a):
    """Get domain details with routes and delegations"""
    if not require_admin(a):
        return
    a.error(501, "Not implemented")

def action_system_domains_update(a):
    """Update domain (e.g., transfer ownership)"""
    if not require_admin(a):
        return
    a.error(501, "Not implemented")

def action_system_domains_delete(a):
    """Delete a domain"""
    if not require_admin(a):
        return
    a.error(501, "Not implemented")

def action_system_domains_routes(a):
    """List all routes"""
    if not require_admin(a):
        return
    a.error(501, "Not implemented")

def action_system_domains_delegations(a):
    """List all delegations"""
    if not require_admin(a):
        return
    a.error(501, "Not implemented")

def action_system_domains_delegation_create(a):
    """Create a delegation"""
    if not require_admin(a):
        return
    a.error(501, "Not implemented")

def action_system_domains_delegation_delete(a):
    """Delete a delegation"""
    if not require_admin(a):
        return
    a.error(501, "Not implemented")
