# Mochi settings app: system/documents
# Copyright © 2026 Mochisoft OÜ
# SPDX-License-Identifier: AGPL-3.0-only
# This file is part of Mochi, licensed under the GNU AGPL v3 with the
# Mochi Application Interface Exception - see license.txt and license-exception.md.

def action_document_get(a):
    """Return a server document (rules / terms / privacy) rendered to HTML.
    Settings' own action: a cross-app fetch from the shell iframe loses the
    session and the user's language."""
    name = a.input("name", "")
    if name not in ("rules", "terms", "privacy"):
        a.error.label(404, "errors.unknown_document")
        return
    body = mochi.document.get(name)
    html = mochi.text.markdown(body)
    a.json({"name": name, "body": body, "html": html})

def action_system_documents_list(a):
    """List the (name x language) pairs that exist, without their bodies"""
    if not require_admin(a):
        return
    documents = mochi.document.list()
    a.json({"documents": documents})

def action_system_document_get(a):
    """Get the raw current body and bundled default for one document"""
    if not require_admin(a):
        return
    name = a.input("name")
    language = a.input("language")
    if not name:
        a.error.label(400, "errors.missing_document_name")
        return
    if not language:
        a.error.label(400, "errors.missing_document_language")
        return
    document = mochi.document.source(name, language)
    if not document:
        a.error.label(404, "errors.unknown_document")
        return
    a.json(document)

def action_system_document_set(a):
    """Write an operator override for one document"""
    if not require_admin(a):
        return
    name = a.input("name")
    language = a.input("language")
    body = a.input("body")
    if not name:
        a.error.label(400, "errors.missing_document_name")
        return
    if not language:
        a.error.label(400, "errors.missing_document_language")
        return
    if body == None:
        a.error.label(400, "errors.missing_document_body")
        return
    mochi.document.set(name, language, body)
    a.json({"ok": True})
