# Mochi settings app: system/moderation
# Copyright © 2026 Mochisoft OÜ
# SPDX-License-Identifier: AGPL-3.0-only
# This file is part of Mochi, licensed under the GNU AGPL v3 with the
# Mochi Application Interface Exception - see license.txt and license-exception.md.
#
# The administrators' pages for the other networks (the federation plan,
# phase 40): the reports that reach the server, resolved by dismissing them or
# by blocking or suspending whoever they are about; the owner's blocks of
# domains and of people; and the record of the servers this one talks to.

REPORT_STATES = ["open", "resolved"]

def report_enriched(report):
    """A report with the local user its person is, by name and status."""
    if report.get("user"):
        user = mochi.user.get(report["user"])
        if user:
            report["account"] = {"username": user.get("username", ""), "status": user.get("status", "")}
    return report

def report_targets(report):
    """What a report lets the owner block: the person it is about, where they
    are on another server, and the other server of either party. A reporter on
    another server is blocked by their server, since on the fediverse a
    server reports as a representative of its own."""
    targets = []
    person = report.get("person")
    if person and person.get("blockable"):
        targets.append(person["id"])
    for party in [person, report.get("reporter")]:
        if party and party.get("host"):
            targets.append(party["host"])
    return targets

def action_system_reports_list(a):
    """The reports waiting, oldest first, or those resolved, latest first."""
    if not require_admin(a):
        return
    state = a.input("state", "open")
    if state not in REPORT_STATES:
        a.error.label(400, "errors.invalid_value_for_key", key="state")
        return
    a.json({"reports": [report_enriched(r) for r in mochi.server.report.list(state=state)]})

def action_system_reports_resolve(a):
    """Resolve a report: dismissed; blocked, with the person or server
    blocked; or suspended, with the local user it is about suspended."""
    if not require_admin(a):
        return
    report = mochi.server.report.get(a.input("id", ""))
    if not report:
        a.error.label(404, "errors.report_not_found")
        return
    if report.get("resolved"):
        a.error.label(400, "errors.report_resolved")
        return
    outcome = a.input("outcome", "")
    if outcome == "blocked":
        target = a.input("target", "")
        if target not in report_targets(report):
            a.error.label(400, "errors.invalid_value_for_key", key="target")
            return
        mochi.server.block.add(target)
    elif outcome == "suspended":
        if not mochi.user.session.reauthenticate(a.input("token", "")):
            a.error.label(400, "errors.reauthentication_required")
            return
        uid = report.get("user", "")
        if not uid:
            a.error.label(400, "errors.report_no_user")
            return
        if not user_other(a, uid):
            return
        mochi.user.suspend(uid)
    elif outcome != "dismissed":
        a.error.label(400, "errors.invalid_value_for_key", key="outcome")
        return
    mochi.server.report.resolve(report["id"], outcome)
    a.json({"resolved": True})

def blocks_split(blocks):
    """The owner's blocks as domains and people."""
    domains = []
    people = []
    for block in blocks:
        if block.get("domain"):
            domains.append({"domain": block["domain"], "created": block["created"]})
        elif block.get("actor"):
            people.append({"actor": block["actor"], "created": block["created"]})
    return {"domains": domains, "people": people}

def action_system_blocks_list(a):
    """The domains and the people the owner blocks."""
    if not require_admin(a):
        return
    a.json(blocks_split(mochi.server.block.list()))

def action_system_blocks_add(a):
    """Block a domain, or a person by their id on their network, for the
    whole server."""
    if not require_admin(a):
        return
    target = a.input("target", "").strip()
    if not target:
        a.error.label(400, "errors.target_is_required")
        return
    if len(target) > 2000:
        a.error.label(400, "errors.value_too_long", field="target", maximum=2000)
        return
    refusal = mochi.server.block.check(target)
    if refusal == "local":
        a.error.label(400, "errors.block_local")
        return
    if refusal:
        a.error.label(400, "errors.block_invalid")
        return
    mochi.server.block.add(target)
    a.json(blocks_split(mochi.server.block.list()))

def action_system_blocks_remove(a):
    """Lift a block on a domain or a person."""
    if not require_admin(a):
        return
    target = a.input("target", "").strip()
    if not target:
        a.error.label(400, "errors.target_is_required")
        return
    mochi.server.block.remove(target)
    a.json(blocks_split(mochi.server.block.list()))

def action_system_hosts(a):
    """What the server knows of the servers it talks to on each network."""
    if not require_admin(a):
        return
    a.json(mochi.server.hosts())
