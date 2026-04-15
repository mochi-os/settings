# Mochi Settings — notifications management
# Proxies to the notifications service so the settings UI can manage categories
# and subscriptions without app-level coupling.
# Copyright Alistair Cunningham 2026

def action_notifications_categories(a):
	result = mochi.service.call("notifications", "category/list")
	return {"data": result or []}

def action_notifications_categories_create(a):
	label = a.input("label", "").strip()
	if not label:
		return a.error(400, "label is required")
	badge_raw = a.input("badge", "1")
	badge = 1 if badge_raw == "1" or badge_raw == "true" else 0
	default_raw = a.input("default", "")
	default = 1 if default_raw == "1" or default_raw == "true" else None
	destinations_raw = a.input("destinations", "").strip()
	destinations = json.decode(destinations_raw) if destinations_raw else None
	result = mochi.service.call("notifications", "category/create", label, badge, destinations, default)
	if not result:
		return a.error(400, "Invalid category")
	return {"data": {"id": result}}

def action_notifications_categories_update(a):
	id = a.input("id", "").strip()
	if not id or not id.isdigit():
		return a.error(400, "Invalid id")
	label_raw = a.input("label")
	badge_raw = a.input("badge")
	default_raw = a.input("default")
	destinations_raw = a.input("destinations", "").strip()
	label = label_raw if label_raw != None and label_raw != "" else None
	badge = None
	if badge_raw != None and badge_raw != "":
		badge = 1 if badge_raw == "1" or badge_raw == "true" else 0
	default = None
	if default_raw != None and default_raw != "":
		default = 1 if default_raw == "1" or default_raw == "true" else 0
	destinations = json.decode(destinations_raw) if destinations_raw else None
	ok = mochi.service.call("notifications", "category/update", int(id), label, badge, destinations, default)
	if not ok:
		return a.error(404, "Not found")
	return {"data": {}}

def action_notifications_categories_delete(a):
	id = a.input("id", "").strip()
	reassign = a.input("reassign_to", "").strip()
	if not id or not id.isdigit():
		return a.error(400, "Invalid id")
	if reassign == "" or not reassign.lstrip("-").isdigit():
		return a.error(400, "reassign_to is required")
	ok = mochi.service.call("notifications", "category/delete", int(id), int(reassign))
	if not ok:
		return a.error(400, "Could not delete")
	return {"data": {}}

def action_notifications_categories_test(a):
	id = a.input("id", "").strip()
	if not id or not id.isdigit():
		return a.error(400, "Invalid id")
	result = mochi.service.call("notifications", "category/test", int(id))
	return {"data": result or {"sent": 0, "web": False}}

def action_notifications_subscriptions(a):
	result = mochi.service.call("notifications", "subscription/list")
	return {"data": result or []}

def action_notifications_subscriptions_set_category(a):
	id = a.input("id", "").strip()
	if not id or not id.isdigit():
		return a.error(400, "Invalid id")
	cat_raw = a.input("category", "")
	category = None
	if cat_raw != "" and cat_raw.lstrip("-").isdigit():
		category = int(cat_raw)
	ok = mochi.service.call("notifications", "subscription/set_category", int(id), category)
	if not ok:
		return a.error(404, "Not found")
	return {"data": {}}

def action_notifications_subscriptions_reset(a):
	id = a.input("id", "").strip()
	if not id or not id.isdigit():
		return a.error(400, "Invalid id")
	mochi.service.call("notifications", "subscription/reset", int(id))
	return {"data": {}}

def action_notifications_subscriptions_delete(a):
	id = a.input("id", "").strip()
	if not id or not id.isdigit():
		return a.error(400, "Invalid id")
	mochi.service.call("notifications", "subscription/delete", int(id))
	return {"data": {}}

def action_notifications_destinations(a):
	result = mochi.service.call("notifications", "destinations/available")
	return {"data": result or {"accounts": [], "feeds": []}}
