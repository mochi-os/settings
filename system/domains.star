# Mochi settings app: system/domains
# Copyright Alistair Cunningham 2025

def action_system_domains(a):
    """System domains overview - returns all domains with count"""
    if not require_admin(a):
        return
    domains = mochi.domain.list()
    a.json({"domains": domains, "count": len(domains)})

def action_system_domains_list(a):
    """List all domains"""
    if not require_admin(a):
        return
    domains = mochi.domain.list()
    a.json({"domains": domains})

def action_system_domains_get(a):
    """Get domain details with routes and delegations"""
    if not require_admin(a):
        return
    domain = a.input("domain")
    if not domain:
        a.error(400, "Missing domain")
        return
    info = mochi.domain.get(domain)
    if not info:
        a.error(404, "Domain not found")
        return
    routes = mochi.domain.route.list(domain)
    delegations = mochi.domain.delegation.list(domain, 0)
    a.json({"domain": info, "routes": routes, "delegations": delegations})

def action_system_domains_update(a):
    """Update domain (verified, tls settings)"""
    if not require_admin(a):
        return
    domain = a.input("domain")
    if not domain:
        a.error(400, "Missing domain")
        return
    verified = a.input("verified")
    tls = a.input("tls")
    # Convert string inputs to booleans if provided
    verified_bool = None
    tls_bool = None
    if verified != None:
        verified_bool = verified == "true" or verified == "1"
    if tls != None:
        tls_bool = tls == "true" or tls == "1"
    mochi.domain.update(domain, verified=verified_bool, tls=tls_bool)
    a.json({"ok": True})

def action_system_domains_delete(a):
    """Delete a domain"""
    if not require_admin(a):
        return
    domain = a.input("domain")
    if not domain:
        a.error(400, "Missing domain")
        return
    mochi.domain.delete(domain)
    a.json({"ok": True})

def action_system_domains_routes(a):
    """List all routes for a domain"""
    if not require_admin(a):
        return
    domain = a.input("domain")
    if not domain:
        a.error(400, "Missing domain")
        return
    routes = mochi.domain.route.list(domain)
    a.json({"routes": routes})

def action_system_domains_delegations(a):
    """List all delegations for a domain"""
    if not require_admin(a):
        return
    domain = a.input("domain")
    if not domain:
        a.error(400, "Missing domain")
        return
    delegations = mochi.domain.delegation.list(domain, 0)
    a.json({"delegations": delegations})

def action_system_domains_delegation_create(a):
    """Create a delegation"""
    if not require_admin(a):
        return
    domain = a.input("domain")
    path = a.input("path")
    owner = a.input("owner")
    if not domain or path == None or not owner:
        a.error(400, "Missing required fields: domain, path, owner")
        return
    mochi.domain.delegation.create(domain, path, int(owner))
    a.json({"ok": True})

def action_system_domains_delegation_delete(a):
    """Delete a delegation"""
    if not require_admin(a):
        return
    domain = a.input("domain")
    path = a.input("path")
    owner = a.input("owner")
    if not domain or path == None or not owner:
        a.error(400, "Missing required fields: domain, path, owner")
        return
    mochi.domain.delegation.delete(domain, path, int(owner))
    a.json({"ok": True})
