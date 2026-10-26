#!/bin/bash
# Copyright © 2026 Mochisoft OÜ
# SPDX-License-Identifier: AGPL-3.0-only
# This file is part of Mochi, licensed under the GNU AGPL v3 with the
# Mochi Application Interface Exception - see license.txt and license-exception.md.

# Moderation Test Suite
# Tests the administrators' reports, the owner's blocks and the record of other
# servers through the settings app endpoints (the federation plan, phase 40).
# Reports arrive from other networks, so the suite seeds them into the
# instance's networks.db, then resolves them as an administrator would.
# Usage: ./test_moderation.sh [data directory, default /home/alistair/var/lib/mochi]

set -e

CURL_HELPER="$(cd "$(dirname "$0")/../../../claude/scripts" && pwd)/curl.sh"
DATA="${1:-/home/alistair/var/lib/mochi}"
NETWORKS="$DATA/db/networks.db"
USERS="$DATA/db/users.db"

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

if [ ! -f "$NETWORKS" ] || [ ! -f "$USERS" ]; then
    echo "No instance data at $DATA"
    exit 1
fi

PREFIX="test-moderation-$$"
FIRST="$PREFIX-1"
SECOND="$PREFIX-2"
THIRD="$PREFIX-3"
FOURTH="$PREFIX-4"
cleanup() {
    sqlite3 "$NETWORKS" "delete from reports where id like '$PREFIX-%'; delete from blocks where domain in ('spam.test', 'elsewhere.test'); delete from blocked where actor in ('xmpp:troll@chat.test', 'https://spam.test/users/bot')"
    if [ -n "$OWN" ]; then
        sqlite3 "$NETWORKS" "delete from blocks where domain='$OWN'"
    fi
}
trap cleanup EXIT

# A user here for the second report to be about.
PERSON=$(sqlite3 "$USERS" "select uid from users where role='user' and status='active' limit 1")
PERSON_NAME=$(sqlite3 "$USERS" "select username from users where uid='$PERSON'")
NOW=$(date +%s)
sqlite3 "$NETWORKS" "insert into reports (id, network, reporter, person, user, objects, category, comment, names, host, created) values ('$FIRST', 'fediverse', 'https://spam.test/actor', 'https://spam.test/users/bot', '', '[\"https://spam.test/notes/1\"]', 'spam', 'Selling things', '{\"https://spam.test/actor\":\"spam.test\",\"https://spam.test/users/bot\":\"@bot@spam.test\"}', 'spam.test', $NOW)"
sqlite3 "$NETWORKS" "insert into reports (id, network, reporter, person, user, category, comment, created) values ('$SECOND', 'xmpp', 'xmpp:reporter@chat.test', 'xmpp:local@chat.test', '$PERSON', 'abuse', 'Rude', $((NOW + 1)))"
sqlite3 "$NETWORKS" "insert into reports (id, network, reporter, person, created) values ('$FOURTH', 'fediverse', 'https://example.test/~local', 'https://spam.test/users/bot', $((NOW + 3)))"
# A report about a user id no account holds, for the suspension's refusal: a
# check that let it through would answer that the user is not found, and
# suspend nobody.
sqlite3 "$NETWORKS" "insert into reports (id, network, reporter, person, user, created) values ('$THIRD', 'xmpp', 'xmpp:reporter@chat.test', 'xmpp:gone@chat.test', 'u-nobody-$$', $((NOW + 2)))"

echo "=============================================="
echo "Moderation Test Suite"
echo "=============================================="

# ============================================================================
# REPORTS
# ============================================================================

echo ""
echo "--- Reports ---"

RESULT=$(settings_curl GET "/-/system/reports/list")
FIRST_JSON=$(echo "$RESULT" | python3 -c "import json,sys; print(json.dumps([r for r in json.load(sys.stdin)['reports'] if r['id']=='$FIRST']))")
if echo "$FIRST_JSON" | grep -q '"blockable": true' && echo "$FIRST_JSON" | grep -q '"host": "spam.test"' && echo "$FIRST_JSON" | grep -q '@bot@spam.test'; then
    pass "A waiting report lists its person, blockable, with their server"
else
    fail "A waiting report lists its person, blockable, with their server" "$FIRST_JSON"
fi
SECOND_JSON=$(echo "$RESULT" | python3 -c "import json,sys; print(json.dumps([r for r in json.load(sys.stdin)['reports'] if r['id']=='$SECOND']))")
if echo "$SECOND_JSON" | grep -q "\"username\": \"$PERSON_NAME\""; then
    pass "A report about someone here names their account"
else
    fail "A report about someone here names their account" "$SECOND_JSON"
fi

RESULT=$(settings_curl GET "/-/system/reports/list?state=later")
if echo "$RESULT" | grep -qi 'invalid'; then
    pass "An unknown state is refused"
else
    fail "An unknown state is refused" "$RESULT"
fi

RESULT=$(settings_curl POST "/-/system/reports/resolve" -d "id=$FIRST&outcome=blocked&target=elsewhere.test")
if echo "$RESULT" | grep -qi 'invalid'; then
    pass "Blocking something the report does not name is refused"
else
    fail "Blocking something the report does not name is refused" "$RESULT"
fi

RESULT=$(settings_curl POST "/-/system/reports/resolve" -d "id=$FIRST&outcome=blocked&target=spam.test")
if echo "$RESULT" | grep -q '"resolved":true'; then
    pass "A report is resolved by blocking the reported person's server"
else
    fail "A report is resolved by blocking the reported person's server" "$RESULT"
fi

RESULT=$(settings_curl GET "/-/system/blocks/list")
if echo "$RESULT" | grep -q '"domain":"spam.test"'; then
    pass "The server is blocked"
else
    fail "The server is blocked" "$RESULT"
fi

RESULT=$(settings_curl POST "/-/system/reports/resolve" -d "id=$FOURTH&outcome=blocked&target=https://spam.test/users/bot")
BLOCKS=$(settings_curl GET "/-/system/blocks/list")
if echo "$RESULT" | grep -q '"resolved":true' && echo "$BLOCKS" | grep -q '"actor":"https://spam.test/users/bot"'; then
    pass "A report is resolved by blocking the person it is about"
else
    fail "A report is resolved by blocking the person it is about" "$RESULT $BLOCKS"
fi

RESULT=$(settings_curl GET "/-/system/reports/list?state=resolved")
if echo "$RESULT" | python3 -c "import json,sys; r=[x for x in json.load(sys.stdin)['reports'] if x['id']=='$FIRST']; sys.exit(0 if r and r[0]['outcome']=='blocked' and r[0]['resolved']>0 else 1)"; then
    pass "The resolved report says how"
else
    fail "The resolved report says how" "$RESULT"
fi

RESULT=$(settings_curl POST "/-/system/reports/resolve" -d "id=$FIRST&outcome=dismissed")
if echo "$RESULT" | grep -qi 'already been resolved'; then
    pass "A report is resolved once"
else
    fail "A report is resolved once" "$RESULT"
fi

RESULT=$(settings_curl POST "/-/system/reports/resolve" -d "id=$PREFIX-none&outcome=dismissed")
if echo "$RESULT" | grep -qi 'not found'; then
    pass "An unknown report is not found"
else
    fail "An unknown report is not found" "$RESULT"
fi

RESULT=$(settings_curl POST "/-/system/reports/resolve" -d "id=$THIRD&outcome=suspended")
if echo "$RESULT" | grep -qi 're-\?authentication'; then
    pass "A suspension without a step-up proof is refused"
else
    fail "A suspension without a step-up proof is refused" "$RESULT"
fi

RESULT=$(settings_curl POST "/-/system/reports/resolve" -d "id=$SECOND&outcome=ignored")
if echo "$RESULT" | grep -qi 'invalid'; then
    pass "An unknown outcome is refused"
else
    fail "An unknown outcome is refused" "$RESULT"
fi

RESULT=$(settings_curl POST "/-/system/reports/resolve" -d "id=$SECOND&outcome=dismissed")
if echo "$RESULT" | grep -q '"resolved":true'; then
    pass "A report is dismissed"
else
    fail "A report is dismissed" "$RESULT"
fi

RESULT=$("$CURL_HELPER" -a user "/settings/-/system/reports/list")
if echo "$RESULT" | grep -qi 'administrator'; then
    pass "A user who is not an administrator is refused the reports"
else
    fail "A user who is not an administrator is refused the reports" "$RESULT"
fi

# ============================================================================
# BLOCKS
# ============================================================================

echo ""
echo "--- Blocks ---"

RESULT=$(settings_curl POST "/-/system/blocks/add" -d "target=not a thing")
if echo "$RESULT" | grep -qi "address on their network"; then
    pass "Neither a domain nor a person is refused"
else
    fail "Neither a domain nor a person is refused" "$RESULT"
fi

# A domain of this server's own: one its hosted accounts are on, or a verified one.
OWN=$(sqlite3 "$NETWORKS" "select domain from actors where deleted=0 limit 1")
if [ -z "$OWN" ] && [ -f "$DATA/db/domains.db" ]; then
    OWN=$(sqlite3 "$DATA/db/domains.db" "select domain from domains where verified=1 limit 1")
fi
if [ -n "$OWN" ]; then
    RESULT=$(settings_curl POST "/-/system/blocks/add" -d "target=$OWN")
    if echo "$RESULT" | grep -qi "cannot be blocked"; then
        pass "This server's own domain is refused"
    else
        fail "This server's own domain is refused" "$RESULT"
    fi
fi

RESULT=$(settings_curl POST "/-/system/blocks/add" -d "target=xmpp:troll@chat.test")
if echo "$RESULT" | grep -q '"actor":"xmpp:troll@chat.test"'; then
    pass "A person is blocked"
else
    fail "A person is blocked" "$RESULT"
fi

RESULT=$(settings_curl POST "/-/system/blocks/remove" -d "target=xmpp:troll@chat.test")
if echo "$RESULT" | grep -q 'troll@chat.test'; then
    fail "A block on a person is lifted" "$RESULT"
else
    pass "A block on a person is lifted"
fi

RESULT=$(settings_curl POST "/-/system/blocks/remove" -d "target=spam.test")
if echo "$RESULT" | grep -q '"domain":"spam.test"'; then
    fail "A block on a server is lifted" "$RESULT"
else
    pass "A block on a server is lifted"
fi

# ============================================================================
# FEDERATION
# ============================================================================

echo ""
echo "--- Federation ---"

RESULT=$(settings_curl GET "/-/system/hosts")
if echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if isinstance(d['fediverse'], list) and isinstance(d['matrix'], list) and 'clients' in d['xmpp']['sessions'] else 1)"; then
    pass "Each network's servers are listed"
else
    fail "Each network's servers are listed" "$RESULT"
fi

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "=============================================="
echo "Results: $PASSED passed, $FAILED failed"
echo "=============================================="

[ "$FAILED" -eq 0 ]
