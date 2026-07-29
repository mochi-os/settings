# Mochi settings app: domains
# Copyright © 2026 Mochisoft OÜ
# SPDX-License-Identifier: AGPL-3.0-only
# This file is part of Mochi, licensed under the GNU AGPL v3 with the
# Mochi Application Interface Exception - see license.txt and license-exception.md.

def is_admin(a):
    """Check if user is admin"""
    return a.user.role == "administrator"

def delegation_covers(delegated, path):
    """Whether a delegated path prefix covers a path. Matching is on whole
    path segments, mirroring core's delegation_covers: /blog covers /blog and
    /blog/post but not /blogger; "" or "/" covers the whole domain."""
    delegated = delegated.rstrip("/")
    if delegated == "":
        return True
    return path == delegated or path.startswith(delegated + "/")

def can_manage_path(a, domain, path):
    """Check if user can manage a path on a domain"""
    delegations = mochi.domain.delegation.list(domain, a.user.id)
    for d in delegations:
        if delegation_covers(d["path"], path):
            return True
    return False

def enrich_delegations(delegations):
    """Add username to delegation records"""
    # One delegate usually holds several paths on a domain, so the same owner
    # repeats down the list. Resolve each owner once per request rather than
    # once per row; there is no bulk lookup to ask instead.
    usernames = {}
    result = []
    for d in delegations:
        owner = d["owner"]
        if owner not in usernames:
            user = mochi.user.get(owner)
            usernames[owner] = user["username"] if user else mochi.app.label("delegations.user_unknown")
        result.append({"domain": d["domain"], "path": d["path"], "owner": owner, "username": usernames[owner]})
    return result

def action_domains_create(a):
    """Create a new domain (admin only)"""
    if not require_admin(a):
        return
    domain = a.input("domain")
    if not domain:
        a.error.label(400, "errors.missing_domain")
        return
    result = mochi.domain.register(domain)
    a.json(result)

def action_domains(a):
    """Domains overview - returns domains based on role"""
    admin = is_admin(a)
    if admin:
        domains = mochi.domain.list()
        a.json({"domains": domains, "count": len(domains), "admin": True})
    else:
        delegations = mochi.domain.delegation.list("", a.user.id)
        # A delegate normally holds several paths on the same domain, so look
        # each domain up once. The misses are remembered too: keying only on
        # the hits meant a domain that no longer resolves was asked for again
        # on every one of its delegations.
        domain_map = {}
        for d in delegations:
            if d["domain"] not in domain_map:
                domain_map[d["domain"]] = mochi.domain.get(d["domain"])
        domains = [info for info in domain_map.values() if info]
        a.json({"domains": domains, "delegations": delegations, "count": len(domains), "admin": False})

def action_domains_get(a):
    """Get domain details with routes and delegations"""
    domain = a.input("domain")
    if not domain:
        a.error.label(400, "errors.missing_domain")
        return
    admin = is_admin(a)
    if admin:
        info = mochi.domain.get(domain)
        if not info:
            a.error.label(404, "errors.domain_not_found")
            return
        routes = enrich_routes_with_names(mochi.domain.route.list(domain))
        delegations = mochi.domain.delegation.list(domain, "")
        a.json({"domain": info, "routes": routes, "delegations": enrich_delegations(delegations), "admin": True})
    else:
        delegations = mochi.domain.delegation.list(domain, a.user.id)
        if not delegations:
            a.error.label(403, "errors.no_access_to_domain")
            return
        info = mochi.domain.get(domain)
        if not info:
            a.error.label(404, "errors.domain_not_found")
            return
        routes = mochi.domain.route.list(domain)
        accessible_routes = []
        for route in routes:
            for d in delegations:
                if delegation_covers(d["path"], route["path"]):
                    accessible_routes.append(route)
                    break
        a.json({"domain": info, "routes": enrich_routes_with_names(accessible_routes), "delegations": delegations, "admin": False})

def action_domains_update(a):
    """Update domain settings (admin only)"""
    if not require_admin(a):
        return
    domain = a.input("domain")
    if not domain:
        a.error.label(400, "errors.missing_domain")
        return
    # An absent field is left alone, but a present one must say exactly what it
    # means: treating every unrecognised value as false silently un-verifies the
    # domain, and with domains_verification on that stops it routing at all.
    verified = a.input("verified")
    tls = a.input("tls")
    verified_bool = None
    tls_bool = None
    if verified != None:
        if verified != "true" and verified != "false":
            a.error.label(400, "errors.invalid_value_for_key", key="verified")
            return
        verified_bool = verified == "true"
    if tls != None:
        if tls != "true" and tls != "false":
            a.error.label(400, "errors.invalid_value_for_key", key="tls")
            return
        tls_bool = tls == "true"
    mochi.domain.update(domain, verified=verified_bool, tls=tls_bool)
    a.json({"ok": True})

def action_domains_delete(a):
    """Delete a domain (admin only)"""
    if not require_admin(a):
        return
    domain = a.input("domain")
    if not domain:
        a.error.label(400, "errors.missing_domain")
        return
    mochi.domain.delete(domain)
    a.json({"ok": True})

def action_domains_verify(a):
    """Verify domain ownership via DNS TXT record (admin only)"""
    if not require_admin(a):
        return
    domain = a.input("domain")
    if not domain:
        a.error.label(400, "errors.missing_domain")
        return
    result = mochi.domain.verify(domain)
    a.json({"verified": result})

# Route management

def action_domains_route_create(a):
    """Create a route"""
    domain = a.input("domain")
    path = a.input("path")
    method = a.input("method")
    target = a.input("target")
    if not domain or path == None or not method or not target:
        a.error.label(400, "errors.missing_required_fields")
        return
    if not is_admin(a):
        if not can_manage_path(a, domain, path):
            a.error.label(403, "errors.no_permission_to_manage_this_path")
            return
    priority = parse_int(a.input("priority"), 0)
    context = a.input("context") or ""
    result = mochi.domain.route.create(domain, path, method, target, priority, context=context)
    a.json(result)

def action_domains_route_update(a):
    """Update a route"""
    domain = a.input("domain")
    path = a.input("path")
    if not domain or path == None:
        a.error.label(400, "errors.missing_required_fields_domain_path")
        return
    if not is_admin(a):
        if not can_manage_path(a, domain, path):
            a.error.label(403, "errors.no_permission_to_manage_this_path")
            return
    method = a.input("method")
    target = a.input("target")
    priority = a.input("priority")
    enabled = a.input("enabled")
    kwargs = {}
    if method:
        kwargs["method"] = method
    if target:
        kwargs["target"] = target
    if priority:
        parsed = parse_int(priority, None)
        if parsed != None:
            kwargs["priority"] = parsed
    if enabled:
        kwargs["enabled"] = enabled == "true"
    mochi.domain.route.update(domain, path, **kwargs)
    a.json({"ok": True})

def action_domains_route_delete(a):
    """Delete a route"""
    domain = a.input("domain")
    path = a.input("path")
    if not domain or path == None:
        a.error.label(400, "errors.missing_required_fields_domain_path")
        return
    if not is_admin(a):
        if not can_manage_path(a, domain, path):
            a.error.label(403, "errors.no_permission_to_manage_this_path")
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
        a.error.label(400, "errors.missing_required_fields_domain_path_owner")
        return
    mochi.domain.delegation.create(domain, path, owner)
    a.json({"ok": True})

def action_domains_delegation_delete(a):
    """Delete a delegation (admin only)"""
    if not require_admin(a):
        return
    domain = a.input("domain")
    path = a.input("path")
    owner = a.input("owner")
    if not domain or path == None or not owner:
        a.error.label(400, "errors.missing_required_fields_domain_path_owner")
        return
    mochi.domain.delegation.delete(domain, path, owner)
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

def action_domains_apps(a):
    """List available apps for route targets"""
    apps = mochi.app.list()
    a.json({"apps": apps})

def action_domains_entities(a):
    """List entities owned by the current user for route targets"""
    entities = mochi.entity.owned()
    a.json({"entities": entities})

def enrich_routes_with_names(routes):
    """Add app_name or entity_name to routes based on method"""
    # A domain routes many paths at the same handful of apps and entities, so
    # resolve each distinct target once per request. The cache holds the misses
    # too - an app that no longer exists is worth not asking about repeatedly.
    names = {}
    result = []
    for route in routes:
        key = route["method"] + ":" + route["target"]
        if route["method"] == "app":
            if key not in names:
                app = mochi.app.get(route["target"])
                names[key] = app["name"] if app else None
        elif route["method"] == "entity":
            # Resolved by id rather than against the viewing admin's own
            # entities: a delegate's route points at an entity the admin does
            # not own, which otherwise left the raw id on screen. entity.name
            # aborts the action on a malformed id, so check the shape first.
            if key not in names:
                target = route["target"]
                names[key] = None
                if mochi.text.valid(target, "entity") or mochi.text.valid(target, "fingerprint"):
                    names[key] = mochi.entity.name(target)
        if names.get(key):
            route = dict(route)
            route["target_name"] = names[key]
        result.append(route)
    return result
