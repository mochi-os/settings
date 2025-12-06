# Mochi settings app: user/domains
# Copyright Alistair Cunningham 2025

def action_user_domains(a):
    """User domains overview - returns delegations and routes"""
    if not require_user(a):
        return
    # Get delegations for this user
    delegations = mochi.domain.delegation.list("", a.user.id)

    # Get unique domains user has full access to (path="")
    domains = []
    for d in delegations:
        if d["path"] == "":
            domain_info = mochi.domain.get(d["domain"])
            if domain_info:
                domains.append(domain_info)

    a.json({"domains": domains, "delegations": delegations})

def action_user_domains_list(a):
    """List user's domains (those with full delegation)"""
    if not require_user(a):
        return
    delegations = mochi.domain.delegation.list("", a.user.id)
    domains = []
    for d in delegations:
        if d["path"] == "":
            domain_info = mochi.domain.get(d["domain"])
            if domain_info:
                domains.append(domain_info)
    a.json({"domains": domains})

def action_user_domains_register(a):
    """Register a new domain (admin only)"""
    if not require_user(a):
        return
    a.error(403, "Domain registration requires administrator")

def action_user_domains_delete(a):
    """Delete a domain (admin only)"""
    if not require_user(a):
        return
    a.error(403, "Domain deletion requires administrator")

def action_user_domains_routes(a):
    """List routes on a domain the user has access to"""
    if not require_user(a):
        return
    domain = a.input("domain")
    if not domain:
        a.error(400, "Missing domain")
        return
    # Check user has delegation for this domain
    delegations = mochi.domain.delegation.list(domain, a.user.id)
    if not delegations:
        a.error(403, "No access to domain")
        return
    routes = mochi.domain.route.list(domain)
    # Filter routes to those under user's delegated paths
    accessible_routes = []
    for route in routes:
        for d in delegations:
            if d["path"] == "" or route["path"].startswith(d["path"]):
                accessible_routes.append(route)
                break
    a.json({"routes": accessible_routes})

def action_user_domains_route_set(a):
    """Add or update a route"""
    if not require_user(a):
        return
    domain = a.input("domain")
    path = a.input("path")
    entity = a.input("entity")
    if not domain or path == None or not entity:
        a.error(400, "Missing required fields: domain, path, entity")
        return
    # Check if route exists
    existing = mochi.domain.route.get(domain, path)
    if existing:
        result = mochi.domain.route.update(domain, path, entity=entity)
    else:
        priority = int(a.input("priority") or "0")
        context = a.input("context") or ""
        result = mochi.domain.route.create(domain, path, entity, priority, context=context)
    a.json(result)

def action_user_domains_route_delete(a):
    """Delete a route"""
    if not require_user(a):
        return
    domain = a.input("domain")
    path = a.input("path")
    if not domain or path == None:
        a.error(400, "Missing required fields: domain, path")
        return
    mochi.domain.route.delete(domain, path)
    a.json({"ok": True})
