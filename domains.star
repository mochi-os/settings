# Mochi settings app: domains
# Copyright Alistair Cunningham 2025

def is_admin(a):
    """Check if user is admin"""
    return a.user != None and a.user.role == "administrator"

def can_manage_path(a, domain, path):
    """Check if user can manage a path on a domain"""
    delegations = mochi.domain.delegation.list(domain, a.user.id)
    for d in delegations:
        if d["path"] == "" or path.startswith(d["path"]):
            return True
    return False

def enrich_delegations(delegations):
    """Add username to delegation records"""
    result = []
    for d in delegations:
        user = mochi.user.get.id(d["owner"])
        username = user["username"] if user else "Unknown"
        result.append({"domain": d["domain"], "path": d["path"], "owner": d["owner"], "username": username})
    return result

def action_domains(a):
    """Domains overview - returns domains based on role"""
    if not require_user(a):
        return
    admin = is_admin(a)
    if admin:
        domains = mochi.domain.list()
        a.json({"domains": domains, "count": len(domains), "admin": True})
    else:
        delegations = mochi.domain.delegation.list("", a.user.id)
        domain_map = {}
        for d in delegations:
            if d["domain"] not in domain_map:
                domain_info = mochi.domain.get(d["domain"])
                if domain_info:
                    domain_map[d["domain"]] = domain_info
        domains = list(domain_map.values())
        a.json({"domains": domains, "delegations": enrich_delegations(delegations), "count": len(domains), "admin": False})

def action_domains_get(a):
    """Get domain details with routes and delegations"""
    if not require_user(a):
        return
    domain = a.input("domain")
    if not domain:
        a.error(400, "Missing domain")
        return
    admin = is_admin(a)
    if admin:
        info = mochi.domain.get(domain)
        if not info:
            a.error(404, "Domain not found")
            return
        routes = mochi.domain.route.list(domain)
        delegations = mochi.domain.delegation.list(domain, 0)
        a.json({"domain": info, "routes": routes, "delegations": enrich_delegations(delegations), "admin": True})
    else:
        delegations = mochi.domain.delegation.list(domain, a.user.id)
        if not delegations:
            a.error(403, "No access to domain")
            return
        info = mochi.domain.get(domain)
        if not info:
            a.error(404, "Domain not found")
            return
        routes = mochi.domain.route.list(domain)
        accessible_routes = []
        for route in routes:
            for d in delegations:
                if d["path"] == "" or route["path"].startswith(d["path"]):
                    accessible_routes.append(route)
                    break
        a.json({"domain": info, "routes": accessible_routes, "delegations": enrich_delegations(delegations), "admin": False})

def action_domains_update(a):
    """Update domain settings (admin only)"""
    if not require_admin(a):
        return
    domain = a.input("domain")
    if not domain:
        a.error(400, "Missing domain")
        return
    verified = a.input("verified")
    tls = a.input("tls")
    verified_bool = None
    tls_bool = None
    if verified:
        verified_bool = verified == "true"
    if tls:
        tls_bool = tls == "true"
    mochi.domain.update(domain, verified=verified_bool, tls=tls_bool)
    a.json({"ok": True})

def action_domains_delete(a):
    """Delete a domain (admin only)"""
    if not require_admin(a):
        return
    domain = a.input("domain")
    if not domain:
        a.error(400, "Missing domain")
        return
    mochi.domain.delete(domain)
    a.json({"ok": True})

# Route management

def action_domains_route_create(a):
    """Create a route"""
    if not require_user(a):
        return
    domain = a.input("domain")
    path = a.input("path")
    entity = a.input("entity")
    if not domain or path == None or not entity:
        a.error(400, "Missing required fields: domain, path, entity")
        return
    if not is_admin(a):
        if not can_manage_path(a, domain, path):
            a.error(403, "No permission to manage this path")
            return
    priority = int(a.input("priority") or "0")
    context = a.input("context") or ""
    result = mochi.domain.route.create(domain, path, entity, priority, context=context)
    a.json(result)

def action_domains_route_update(a):
    """Update a route"""
    if not require_user(a):
        return
    domain = a.input("domain")
    path = a.input("path")
    if not domain or path == None:
        a.error(400, "Missing required fields: domain, path")
        return
    if not is_admin(a):
        if not can_manage_path(a, domain, path):
            a.error(403, "No permission to manage this path")
            return
    entity = a.input("entity")
    priority = a.input("priority")
    enabled = a.input("enabled")
    kwargs = {}
    if entity:
        kwargs["entity"] = entity
    if priority:
        kwargs["priority"] = int(priority)
    if enabled:
        kwargs["enabled"] = enabled == "true"
    mochi.domain.route.update(domain, path, **kwargs)
    a.json({"ok": True})

def action_domains_route_delete(a):
    """Delete a route"""
    if not require_user(a):
        return
    domain = a.input("domain")
    path = a.input("path")
    if not domain or path == None:
        a.error(400, "Missing required fields: domain, path")
        return
    if not is_admin(a):
        if not can_manage_path(a, domain, path):
            a.error(403, "No permission to manage this path")
            return
    mochi.domain.route.delete(domain, path)
    a.json({"ok": True})

# Delegation management (admin only)

def action_domains_delegation_create(a):
    """Create a delegation (admin only)"""
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

def action_domains_delegation_delete(a):
    """Delete a delegation (admin only)"""
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

def action_domains_user_search(a):
    """Search users by username (admin only, for delegation autocomplete)"""
    if not require_admin(a):
        return
    query = a.input("query")
    if not query:
        a.json({"users": []})
        return
    users = mochi.user.search(query, 10)
    a.json({"users": users})
