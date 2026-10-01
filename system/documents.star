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

# The document a request names, as the editor can load it: one of the three
# names, in a language core ships a bundled default for. Core aborts on a
# malformed language, and would store an override for a language with no
# default that is then served to users but never offered to the editor.
# Answers the error and returns None when there is no such document.
def document_named(a, name, language):
    if not name:
        a.error.label(400, "errors.missing_document_name")
        return None
    if not language:
        a.error.label(400, "errors.missing_document_language")
        return None
    if name not in ("rules", "terms", "privacy"):
        a.error.label(404, "errors.unknown_document")
        return None
    language = language.strip().lower()
    if not mochi.text.valid(language, "locale"):
        a.error.label(400, "errors.invalid_document_language")
        return None
    document = mochi.document.source(name, language)
    if not document:
        a.error.label(404, "errors.unknown_document")
        return None
    return document

def action_system_document_get(a):
    """Get the raw current body and bundled default for one document"""
    if not require_admin(a):
        return
    document = document_named(a, a.input("name"), a.input("language"))
    if document:
        a.json(document)

def action_system_document_set(a):
    """Write an operator override for one document"""
    if not require_admin(a):
        return
    # Checked before the step-up, which spends the proof.
    document = document_named(a, a.input("name"), a.input("language"))
    if not document:
        return
    body = a.input("body")
    if body == None:
        a.error.label(400, "errors.missing_document_body")
        return
    if not mochi.user.session.reauthenticate(a.input("token", "")):
        a.error.label(400, "errors.reauthentication_required")
        return
    mochi.document.set(document["name"], document["language"], body)
    a.json({"ok": True})
