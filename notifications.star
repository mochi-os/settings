# Mochi Settings — notifications management
# Proxies to the notifications service so the settings UI can manage categories
# and topics without app-level coupling.
# Copyright Alistair Cunningham 2026

def action_notifications_categories(a):
	result = mochi.service.call("notifications", "category/list")
	return {"data": result or []}

def action_notifications_categories_create(a):
	label = a.input("label", "").strip()
	if not label:
		return a.error.label(400, "errors.label_is_required")
	default_raw = a.input("default", "")
	default = 1 if default_raw == "1" or default_raw == "true" else None
	destinations_raw = a.input("destinations", "").strip()
	destinations = json.decode(destinations_raw) if destinations_raw else None
	result = mochi.service.call("notifications", "category/create", label, destinations, default)
	if not result:
		return a.error.label(400, "errors.invalid_category")
	return {"data": {"id": result}}

def action_notifications_categories_update(a):
	id = a.input("id", "").strip()
	if not id or len(id) > 64:
		return a.error.label(400, "errors.invalid_id")
	label_raw = a.input("label")
	default_raw = a.input("default")
	destinations_raw = a.input("destinations", "").strip()
	label = label_raw if label_raw != None and label_raw != "" else None
	default = None
	if default_raw != None and default_raw != "":
		default = 1 if default_raw == "1" or default_raw == "true" else 0
	destinations = json.decode(destinations_raw) if destinations_raw else None
	ok = mochi.service.call("notifications", "category/update", id, label, destinations, default)
	if not ok:
		return a.error.label(404, "errors.not_found")
	return {"data": {}}

def action_notifications_categories_delete(a):
	id = a.input("id", "").strip()
	reassign = a.input("reassign_to", "").strip()
	if not id or len(id) > 64:
		return a.error.label(400, "errors.invalid_id")
	if reassign == "" or len(reassign) > 64:
		return a.error.label(400, "errors.reassign_to_is_required")
	ok = mochi.service.call("notifications", "category/delete", id, reassign)
	if not ok:
		return a.error.label(400, "errors.could_not_delete")
	return {"data": {}}

def action_notifications_categories_test(a):
	id = a.input("id", "").strip()
	if not id or len(id) > 64:
		return a.error.label(400, "errors.invalid_id")
	result = mochi.service.call("notifications", "category/test", id)
	return {"data": result or {"sent": 0, "web": False}}

def action_notifications_topics(a):
	result = mochi.service.call("notifications", "topic/list")
	return {"data": result or []}

def action_notifications_topics_set_category(a):
	# app="" identifies server-originated topics (upgrade alerts etc.).
	app = a.input("app", "").strip()
	topic = a.input("topic", "").strip()
	object = a.input("object", "")
	cat_raw = a.input("category", "").strip()
	category = None
	if cat_raw != "" and len(cat_raw) <= 64:
		category = cat_raw
	ok = mochi.service.call("notifications", "topic/set_category", app, topic, object, category)
	if not ok:
		return a.error.label(404, "errors.not_found")
	return {"data": {}}

def action_notifications_topics_delete(a):
	# app="" identifies server-originated topics.
	app = a.input("app", "").strip()
	topic = a.input("topic", "").strip()
	object = a.input("object", "")
	mochi.service.call("notifications", "topic/delete", app, topic, object)
	return {"data": {}}

def action_notifications_destinations(a):
	result = mochi.service.call("notifications", "destinations/available")
	return {"data": result or {"accounts": [], "feeds": []}}
