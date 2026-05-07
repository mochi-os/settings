# Mochi settings app: system/documents
# Copyright Alistair Cunningham 2026

def action_system_documents_list(a):
    """List all (name x language) documents with body and bundled default"""
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
    documents = mochi.document.list()
    for d in documents:
        if d["name"] == name and d["language"] == language:
            a.json(d)
            return
    a.error.label(404, "errors.unknown_document")

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
