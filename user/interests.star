# Mochi settings app: user/interests
# Copyright Alistair Cunningham 2025-2026

# List user interests with resolved labels
def action_interests_list(a):
    interests = mochi.interests.list()
    if len(interests) == 0:
        a.json({"interests": [], "summary": ""})
        return

    # Resolve QID labels
    qids = [i["qid"] for i in interests]
    labels = mochi.qid.lookup(qids, "en")

    for i in interests:
        i["label"] = labels.get(i["qid"], i["qid"]) if type(labels) == type({}) else labels

    summary = mochi.interests.summary()
    a.json({"interests": interests, "summary": summary})

# Set an interest weight
def action_interests_set(a):
    qid = a.input("qid")
    weight = a.input("weight")

    if not qid:
        a.error_label(400, "errors.qid_required")
        return

    if weight == None:
        a.error_label(400, "errors.weight_required")
        return

    w = int(weight)
    if w < -100 or w > 100:
        a.error_label(400, "errors.weight_must_be_100_to_100")
        return

    mochi.interests.set(qid, w)
    a.json({"ok": True})

# Remove an interest
def action_interests_remove(a):
    qid = a.input("qid")
    if not qid:
        a.error_label(400, "errors.qid_required")
        return

    mochi.interests.remove(qid)
    a.json({"ok": True})

# Search for QIDs to add as interests
def action_interests_search(a):
    query = a.input("query")
    if not query or len(query) < 2:
        a.error_label(400, "errors.query_too_short")
        return

    results = mochi.qid.search(query, "en")
    a.json({"results": results})

# Force regenerate interest summary
def action_interests_summary(a):
    summary = mochi.interests.summary(force=True)
    a.json({"summary": summary})
