#!/bin/bash
# Copyright © 2026 Mochisoft OÜ
# SPDX-License-Identifier: AGPL-3.0-only
# This file is part of Mochi, licensed under the GNU AGPL v3 with the
# Mochi Application Interface Exception - see license.txt and license-exception.md.

# Notifications API Test Suite
# Exercises the settings app's -/notifications/* proxy actions and asserts the
# response shape as well as the behaviour. The shape matters on its own: these
# nine actions answered {"data": ...} while the app's other ~88 answered the
# payload directly, and nothing noticed until assertions written against the
# envelope were finally re-run. A payload here must never be wrapped again.
# Usage: ./test_notifications.sh

set -e

CURL_HELPER="$(cd "$(dirname "$0")/../../../claude/scripts" && pwd)/curl.sh"

PASSED=0
FAILED=0

pass() {
    echo "[PASS] $1"
    ((PASSED++)) || true
}

fail() {
    echo "[FAIL] $1: $2"
    ((FAILED++)) || true
}

settings_curl() {
    local method="$1"
    local path="$2"
    shift 2
    "$CURL_HELPER" -a admin -X "$method" "$@" "/settings$path"
}

# A payload is unwrapped when it is not a single-key object called "data".
# Checked structurally rather than by string match so a category legitimately
# labelled "data" cannot pass or fail the test by accident.
assert_unwrapped() {
    local name="$1"
    local json="$2"
    local want="$3"  # list or dict
    local verdict
    verdict=$(echo "$json" | python3 -c "
import sys, json
try:
    body = json.load(sys.stdin)
except Exception as e:
    print('not JSON: %s' % e); raise SystemExit
if isinstance(body, dict) and list(body) == ['data']:
    print('wrapped in a data envelope')
elif '$want' == 'list' and not isinstance(body, list):
    print('expected a list, got %s' % type(body).__name__)
elif '$want' == 'dict' and not isinstance(body, dict):
    print('expected an object, got %s' % type(body).__name__)
else:
    print('ok')
" 2>/dev/null)
    if [ "$verdict" = "ok" ]; then
        pass "$name"
    else
        fail "$name" "${verdict:-no response}"
    fi
}

# An error arrives either as a JSON body or as the HTML page the server renders
# for a non-JSON request. Match the status, never the message text: those are
# labels now and read in the caller's language.
assert_rejected() {
    local name="$1"
    local body="$2"
    if echo "$body" | command grep -qE '"error"|<h1>Error 4[0-9][0-9]</h1>'; then
        pass "$name"
    else
        fail "$name" "got: $(echo "$body" | head -c 100)"
    fi
}

field() {
    echo "$2" | python3 -c "
import sys, json
body = json.load(sys.stdin)
print(body.get('$1', '') if isinstance(body, dict) else '')
" 2>/dev/null
}

echo "=============================================="
echo "Notifications API Test Suite"
echo "=============================================="
echo
echo "--- Response Shape Tests ---"

CATEGORIES=$(settings_curl GET /-/notifications/categories)
assert_unwrapped "Categories list is unwrapped" "$CATEGORIES" list

TOPICS=$(settings_curl GET /-/notifications/topics)
assert_unwrapped "Topics list is unwrapped" "$TOPICS" list

DESTINATIONS=$(settings_curl GET /-/notifications/destinations)
assert_unwrapped "Destinations are unwrapped" "$DESTINATIONS" dict

if echo "$DESTINATIONS" | python3 -c "
import sys, json
body = json.load(sys.stdin)
raise SystemExit(0 if 'accounts' in body and 'feeds' in body else 1)
" 2>/dev/null; then
    pass "Destinations carry accounts and feeds"
else
    fail "Destinations carry accounts and feeds" "got: $(echo "$DESTINATIONS" | head -c 100)"
fi

echo
echo "--- Category Lifecycle Tests ---"

CREATED=$(settings_curl POST /-/notifications/categories/create -d "label=Test category $$")
assert_unwrapped "Create is unwrapped" "$CREATED" dict
ID=$(field id "$CREATED")
if [ -n "$ID" ]; then
    pass "Create returns an id (ID: $ID)"
else
    fail "Create returns an id" "got: $(echo "$CREATED" | head -c 100)"
fi

if [ -n "$ID" ]; then
    LISTED=$(settings_curl GET /-/notifications/categories)
    if echo "$LISTED" | python3 -c "
import sys, json
raise SystemExit(0 if any(c.get('id') == '$ID' for c in json.load(sys.stdin)) else 1)
" 2>/dev/null; then
        pass "Created category appears in the list"
    else
        fail "Created category appears in the list" "id $ID absent"
    fi

    TESTED=$(settings_curl POST /-/notifications/categories/test -d "id=$ID")
    assert_unwrapped "Test is unwrapped" "$TESTED" dict
    if echo "$TESTED" | python3 -c "
import sys, json
body = json.load(sys.stdin)
raise SystemExit(0 if 'sent' in body and 'web' in body else 1)
" 2>/dev/null; then
        pass "Test reports sent and web"
    else
        fail "Test reports sent and web" "got: $(echo "$TESTED" | head -c 100)"
    fi

    UPDATED=$(settings_curl POST /-/notifications/categories/update -d "id=$ID&label=Renamed $$")
    assert_unwrapped "Update is unwrapped" "$UPDATED" dict
    if [ "$(field ok "$UPDATED")" = "True" ]; then
        pass "Update reports ok"
    else
        fail "Update reports ok" "got: $(echo "$UPDATED" | head -c 100)"
    fi

    RENAMED=$(settings_curl GET /-/notifications/categories)
    if echo "$RENAMED" | python3 -c "
import sys, json
match = [c for c in json.load(sys.stdin) if c.get('id') == '$ID']
raise SystemExit(0 if match and match[0].get('label') == 'Renamed $$' else 1)
" 2>/dev/null; then
        pass "Rename is applied"
    else
        fail "Rename is applied" "label unchanged"
    fi
fi

echo
echo "--- Rejection Tests ---"

assert_rejected "Test rejects a missing id" \
    "$(settings_curl POST /-/notifications/categories/test -d 'id=')"

assert_rejected "Create rejects an empty label" \
    "$(settings_curl POST /-/notifications/categories/create -d 'label=')"

assert_rejected "Create rejects malformed destinations" \
    "$(settings_curl POST /-/notifications/categories/create -d "label=Bad $$&destinations=not-json")"

assert_rejected "Create rejects an over-long destination list" \
    "$(settings_curl POST /-/notifications/categories/create -d "label=Bad $$&destinations=$(python3 -c 'import json; print(json.dumps([{"type":"web","target":""}] * 101))')")"

echo
echo "--- Cleanup ---"

if [ -n "$ID" ]; then
    DELETED=$(settings_curl POST /-/notifications/categories/delete -d "id=$ID&reassign_to=0")
    assert_unwrapped "Delete is unwrapped" "$DELETED" dict
    GONE=$(settings_curl GET /-/notifications/categories)
    if echo "$GONE" | python3 -c "
import sys, json
raise SystemExit(0 if not any(c.get('id') == '$ID' for c in json.load(sys.stdin)) else 1)
" 2>/dev/null; then
        pass "Deleted category is gone"
    else
        fail "Deleted category is gone" "id $ID still listed"
    fi
fi

echo
echo "=============================================="
echo "Test Results: $PASSED passed, $FAILED failed"
echo "=============================================="

[ "$FAILED" -eq 0 ]
