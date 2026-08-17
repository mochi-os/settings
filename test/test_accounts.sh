#!/bin/bash
# Copyright © 2026 Mochisoft OÜ
# SPDX-License-Identifier: AGPL-3.0-only
# This file is part of Mochi, licensed under the GNU AGPL v3 with the
# Mochi Application Interface Exception - see license.txt and license-exception.md.

# Connected Accounts Test Suite
# Tests the mochi.account.* API through the settings app endpoints
# Usage: ./test_accounts.sh

set -e

CURL_HELPER="$(cd "$(dirname "$0")/../../../claude/scripts" && pwd)/curl.sh"

PASSED=0
FAILED=0
ACCOUNT_ID=""
EMAIL_ACCOUNT_ID=""

pass() {
    echo "[PASS] $1"
    ((PASSED++)) || true
}

fail() {
    echo "[FAIL] $1: $2"
    ((FAILED++)) || true
}

# Helper to make settings requests
settings_curl() {
    local method="$1"
    local path="$2"
    shift 2
    "$CURL_HELPER" -a admin -X "$method" "$@" "/settings$path"
}

echo "=============================================="
echo "Connected Accounts Test Suite"
echo "=============================================="

# ============================================================================
# PROVIDERS TESTS
# ============================================================================

echo ""
echo "--- Provider Definition Tests ---"

# Test: Get all providers
RESULT=$(settings_curl GET "/-/accounts/providers")
if echo "$RESULT" | grep -q '"type":"email"' && echo "$RESULT" | grep -q '"type":"browser"'; then
    pass "Get all providers"
else
    fail "Get all providers" "$RESULT"
fi

# Test: Get providers filtered by notify capability
RESULT=$(settings_curl GET "/-/accounts/providers?capability=notify")
if echo "$RESULT" | grep -q '"type":"email"' && echo "$RESULT" | grep -q '"type":"browser"' && echo "$RESULT" | grep -q '"type":"pushbullet"'; then
    pass "Get notify providers"
else
    fail "Get notify providers" "$RESULT"
fi

# Test: Verify notify providers don't include AI providers
RESULT=$(settings_curl GET "/-/accounts/providers?capability=notify")
if echo "$RESULT" | grep -q '"type":"claude"'; then
    fail "Notify providers should not include claude" "$RESULT"
else
    pass "Notify providers exclude AI"
fi

# Test: Get providers filtered by ai capability
RESULT=$(settings_curl GET "/-/accounts/providers?capability=ai")
if echo "$RESULT" | grep -q '"type":"claude"' && echo "$RESULT" | grep -q '"type":"openai"'; then
    pass "Get AI providers"
else
    fail "Get AI providers" "$RESULT"
fi

# Test: Verify AI providers don't include notify providers
RESULT=$(settings_curl GET "/-/accounts/providers?capability=ai")
if echo "$RESULT" | grep -q '"type":"email"'; then
    fail "AI providers should not include email" "$RESULT"
else
    pass "AI providers exclude notify"
fi

# Test: Get providers filtered by mcp capability
RESULT=$(settings_curl GET "/-/accounts/providers?capability=mcp")
if echo "$RESULT" | grep -q '"type":"mcp"'; then
    pass "Get MCP providers"
else
    fail "Get MCP providers" "$RESULT"
fi

# Test: Verify provider field definitions
RESULT=$(settings_curl GET "/-/accounts/providers")
if echo "$RESULT" | grep -q '"fields":\[' && echo "$RESULT" | grep -q '"name":"address"'; then
    pass "Provider has field definitions"
else
    fail "Provider has field definitions" "$RESULT"
fi

# Test: Verify email provider requires verification
RESULT=$(settings_curl GET "/-/accounts/providers")
if echo "$RESULT" | python3 -c "import sys, json; providers = json.load(sys.stdin); email = next(p for p in providers if p['type'] == 'email'); sys.exit(0 if email['verify'] else 1)" 2>/dev/null; then
    pass "Email provider requires verification"
else
    fail "Email provider requires verification" "$RESULT"
fi

# ============================================================================
# ADD ACCOUNT TESTS
# ============================================================================

echo ""
echo "--- Add Account Tests ---"

# Test: Add pushbullet account (no verification required)
RESULT=$(settings_curl POST "/-/accounts/add" -d "type=pushbullet&token=test_token_123&label=Test Pushbullet")
if echo "$RESULT" | grep -q '"type":"pushbullet"' && echo "$RESULT" | grep -q '"label":"Test Pushbullet"'; then
    ACCOUNT_ID=$(echo "$RESULT" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
    if [ -n "$ACCOUNT_ID" ]; then
        pass "Add pushbullet account (ID: $ACCOUNT_ID)"
    else
        fail "Add pushbullet account" "Could not extract ID"
    fi
else
    fail "Add pushbullet account" "$RESULT"
fi

# Test: Verify pushbullet account is immediately verified (no email verification)
RESULT=$(settings_curl GET "/-/accounts/list")
if echo "$RESULT" | python3 -c "import sys, json; accounts = json.load(sys.stdin); pb = next(a for a in accounts if a['type'] == 'pushbullet'); sys.exit(0 if pb['verified'] > 0 else 1)" 2>/dev/null; then
    pass "Pushbullet account immediately verified"
else
    fail "Pushbullet account immediately verified" "$RESULT"
fi

# Test: Add email account (requires verification)
RESULT=$(settings_curl POST "/-/accounts/add" -d "type=email&address=test@example.com&label=Test Email")
if echo "$RESULT" | grep -q '"type":"email"' && echo "$RESULT" | grep -q '"identifier":"test@example.com"'; then
    EMAIL_ACCOUNT_ID=$(echo "$RESULT" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
    if [ -n "$EMAIL_ACCOUNT_ID" ]; then
        pass "Add email account (ID: $EMAIL_ACCOUNT_ID)"
    else
        fail "Add email account" "Could not extract ID"
    fi
else
    fail "Add email account" "$RESULT"
fi

# Test: Verify email account is NOT verified (pending verification)
RESULT=$(settings_curl GET "/-/accounts/list")
if echo "$RESULT" | python3 -c "import sys, json; accounts = json.load(sys.stdin); email = next(a for a in accounts if a['type'] == 'email'); sys.exit(0 if email['verified'] == 0 else 1)" 2>/dev/null; then
    pass "Email account pending verification"
else
    fail "Email account pending verification" "$RESULT"
fi

# Test: Add Claude AI account
RESULT=$(settings_curl POST "/-/accounts/add" -d "type=claude&api_key=sk-ant-test-key&label=Test Claude")
if echo "$RESULT" | grep -q '"type":"claude"' && echo "$RESULT" | grep -q '"label":"Test Claude"'; then
    pass "Add Claude account"
else
    fail "Add Claude account" "$RESULT"
fi

# Test: Add MCP account
RESULT=$(settings_curl POST "/-/accounts/add" -d "type=mcp&url=https://mcp.example.com&token=mcp_token&label=Test MCP")
if echo "$RESULT" | grep -q '"type":"mcp"' && echo "$RESULT" | grep -q '"identifier":"https://mcp.example.com"'; then
    pass "Add MCP account"
else
    fail "Add MCP account" "$RESULT"
fi

# Test: Add account with missing required field
RESULT=$(settings_curl POST "/-/accounts/add" -d "type=email&label=No Address")
if echo "$RESULT" | grep -q '"error"' || echo "$RESULT" | grep -q 'required'; then
    pass "Reject account with missing required field"
else
    fail "Reject account with missing required field" "$RESULT"
fi

# Test: Add account with invalid provider type
RESULT=$(settings_curl POST "/-/accounts/add" -d "type=invalid_provider&token=test")
# Matches both shapes an error can take: a JSON body, or the HTML page the
# server renders for a non-JSON request. Not the message text, which is
# translated and would break the test in any non-English locale.
if echo "$RESULT" | grep -qE '"error"|Error 4[0-9][0-9]'; then
    pass "Reject invalid provider type"
else
    fail "Reject invalid provider type" "$RESULT"
fi

# Test: Add account with invalid email address
RESULT=$(settings_curl POST "/-/accounts/add" -d "type=email&address=not-an-email&label=Bad Email")
if echo "$RESULT" | grep -q '"error"' || echo "$RESULT" | grep -q 'invalid'; then
    pass "Reject invalid email address"
else
    fail "Reject invalid email address" "$RESULT"
fi

# ============================================================================
# LIST ACCOUNTS TESTS
# ============================================================================

echo ""
echo "--- List Accounts Tests ---"

# Test: List all accounts
RESULT=$(settings_curl GET "/-/accounts/list")
if echo "$RESULT" | grep -q '"type":"pushbullet"' && echo "$RESULT" | grep -q '"type":"email"' && echo "$RESULT" | grep -q '"type":"claude"'; then
    pass "List all accounts"
else
    fail "List all accounts" "$RESULT"
fi

# Test: List accounts filtered by notify capability
RESULT=$(settings_curl GET "/-/accounts/list?capability=notify")
if echo "$RESULT" | grep -q '"type":"pushbullet"' && echo "$RESULT" | grep -q '"type":"email"'; then
    # Verify AI accounts are excluded
    if echo "$RESULT" | grep -q '"type":"claude"'; then
        fail "List notify accounts should exclude AI" "$RESULT"
    else
        pass "List notify accounts"
    fi
else
    fail "List notify accounts" "$RESULT"
fi

# Test: List accounts filtered by ai capability
RESULT=$(settings_curl GET "/-/accounts/list?capability=ai")
if echo "$RESULT" | grep -q '"type":"claude"'; then
    # Verify notify accounts are excluded
    if echo "$RESULT" | grep -q '"type":"email"'; then
        fail "List AI accounts should exclude email" "$RESULT"
    else
        pass "List AI accounts"
    fi
else
    fail "List AI accounts" "$RESULT"
fi

# Test: Verify secrets are redacted (no api_key, token, etc. in response)
RESULT=$(settings_curl GET "/-/accounts/list")
if echo "$RESULT" | grep -q '"api_key"' || echo "$RESULT" | grep -q '"token"'; then
    fail "Secrets should be redacted" "$RESULT"
else
    pass "Secrets are redacted"
fi

# ============================================================================
# GET SINGLE ACCOUNT TESTS
# ============================================================================

echo ""
echo "--- Get Account Tests ---"

# Test: Get existing account
if [ -n "$ACCOUNT_ID" ]; then
    RESULT=$(settings_curl GET "/-/accounts/get?id=$ACCOUNT_ID")
    if echo "$RESULT" | grep -q '"type":"pushbullet"'; then
        pass "Get existing account"
    else
        fail "Get existing account" "$RESULT"
    fi
fi

# Test: Get non-existent account returns None/null
RESULT=$(settings_curl GET "/-/accounts/get?id=99999")
if echo "$RESULT" | grep -q 'null' || echo "$RESULT" | grep -q '{}' || [ "$(echo "$RESULT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data'))" 2>/dev/null)" == "None" ]; then
    pass "Get non-existent account returns None"
else
    fail "Get non-existent account returns None" "$RESULT"
fi

# ============================================================================
# UPDATE ACCOUNT TESTS
# ============================================================================

echo ""
echo "--- Update Account Tests ---"

# Test: Update account label
if [ -n "$ACCOUNT_ID" ]; then
    RESULT=$(settings_curl POST "/-/accounts/update" -d "id=$ACCOUNT_ID&label=Updated Label")
    if echo "$RESULT" | grep -q 'true' || echo "$RESULT" | grep -q '"data":true'; then
        pass "Update account label"
    else
        fail "Update account label" "$RESULT"
    fi

    # Verify update applied
    RESULT=$(settings_curl GET "/-/accounts/list")
    if echo "$RESULT" | grep -q '"label":"Updated Label"'; then
        pass "Verify label update applied"
    else
        fail "Verify label update applied" "$RESULT"
    fi
fi

# Test: Update non-existent account returns false
RESULT=$(settings_curl POST "/-/accounts/update" -d "id=99999&label=No Such Account")
if echo "$RESULT" | grep -q 'false' || echo "$RESULT" | grep -q '"data":false'; then
    pass "Update non-existent account returns false"
else
    fail "Update non-existent account returns false" "$RESULT"
fi

# ============================================================================
# VERIFY ACCOUNT TESTS
# ============================================================================

echo ""
echo "--- Verify Account Tests ---"

# Test: Resend verification code (call verify with no code)
if [ -n "$EMAIL_ACCOUNT_ID" ]; then
    RESULT=$(settings_curl POST "/-/accounts/verify" -d "id=$EMAIL_ACCOUNT_ID")
    if echo "$RESULT" | grep -q 'true' || echo "$RESULT" | grep -q '"data":true'; then
        pass "Resend verification code"
    else
        fail "Resend verification code" "$RESULT"
    fi
fi

# Test: Verify with wrong code returns false
if [ -n "$EMAIL_ACCOUNT_ID" ]; then
    RESULT=$(settings_curl POST "/-/accounts/verify" -d "id=$EMAIL_ACCOUNT_ID&code=WRONGCODE1")
    if echo "$RESULT" | grep -q 'false' || echo "$RESULT" | grep -q '"data":false'; then
        pass "Verify with wrong code returns false"
    else
        fail "Verify with wrong code returns false" "$RESULT"
    fi
fi

# Test: Verify already verified account returns true
if [ -n "$ACCOUNT_ID" ]; then
    RESULT=$(settings_curl POST "/-/accounts/verify" -d "id=$ACCOUNT_ID&code=anycode")
    if echo "$RESULT" | grep -q 'true' || echo "$RESULT" | grep -q '"data":true'; then
        pass "Verify already verified account returns true"
    else
        fail "Verify already verified account returns true" "$RESULT"
    fi
fi

# ============================================================================
# REMOVE ACCOUNT TESTS
# ============================================================================

echo ""
echo "--- Remove Account Tests ---"

# Test: Remove account
if [ -n "$ACCOUNT_ID" ]; then
    RESULT=$(settings_curl POST "/-/accounts/remove" -d "id=$ACCOUNT_ID")
    if echo "$RESULT" | grep -q 'true' || echo "$RESULT" | grep -q '"data":true'; then
        pass "Remove account"
    else
        fail "Remove account" "$RESULT"
    fi

    # Verify removal
    RESULT=$(settings_curl GET "/-/accounts/list")
    if echo "$RESULT" | grep -q '"label":"Updated Label"'; then
        fail "Verify account removed" "Account still exists"
    else
        pass "Verify account removed"
    fi
fi

# Test: Remove non-existent account returns false
RESULT=$(settings_curl POST "/-/accounts/remove" -d "id=99999")
if echo "$RESULT" | grep -q 'false' || echo "$RESULT" | grep -q '"data":false'; then
    pass "Remove non-existent account returns false"
else
    fail "Remove non-existent account returns false" "$RESULT"
fi

# ============================================================================
# CLEANUP
# ============================================================================

# ============================================================================
# INPUT BOUND TESTS
# ============================================================================

echo ""
echo "--- Input Bound Tests ---"

# Test: model is bounded like its sibling label. It reached mochi.account.update
# unchecked while label was capped at 4096, so one field of the same row had a
# limit and the other did not.
LONG=$(python3 -c "print('m' * 5000)")
RESULT=$(settings_curl POST "/-/accounts/add" -d "type=claude&api_key=sk-test-bounds")
BOUND_ID=$(echo "$RESULT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || true)
if [ -n "$BOUND_ID" ]; then
    pass "Add account for bound tests (ID: $BOUND_ID)"

    RESULT=$(settings_curl POST "/-/accounts/update" -d "id=$BOUND_ID&model=$LONG")
    if echo "$RESULT" | grep -qE '"error"|<h1>Error 4[0-9][0-9]</h1>'; then
        pass "Reject an over-long model"
    else
        fail "Reject an over-long model" "$(echo "$RESULT" | head -c 100)"
    fi

    RESULT=$(settings_curl POST "/-/accounts/update" -d "id=$BOUND_ID&model=claude-sonnet-5")
    if ! echo "$RESULT" | grep -qE '"error"|<h1>Error 4[0-9][0-9]</h1>'; then
        pass "Accept a normal model"
    else
        fail "Accept a normal model" "$(echo "$RESULT" | head -c 100)"
    fi

    # The default column is read back to choose the account for a capability,
    # so a value no provider declares stores a default nothing can match.
    RESULT=$(settings_curl POST "/-/accounts/default" -d "account=$BOUND_ID&type=not-a-capability")
    if echo "$RESULT" | grep -qE '"error"|<h1>Error 4[0-9][0-9]</h1>'; then
        pass "Reject an unknown default capability"
    else
        fail "Reject an unknown default capability" "$(echo "$RESULT" | head -c 100)"
    fi

    RESULT=$(settings_curl POST "/-/accounts/default" -d "account=$BOUND_ID&type=ai")
    if echo "$RESULT" | grep -q '"ok"'; then
        pass "Accept a declared default capability"
    else
        fail "Accept a declared default capability" "$(echo "$RESULT" | head -c 100)"
    fi

    RESULT=$(settings_curl POST "/-/accounts/default" -d "account=$BOUND_ID&type=")
    if echo "$RESULT" | grep -q '"ok"'; then
        pass "Accept an empty default, which clears it"
    else
        fail "Accept an empty default, which clears it" "$(echo "$RESULT" | head -c 100)"
    fi

    settings_curl POST "/-/accounts/remove" -d "id=$BOUND_ID" > /dev/null 2>&1
else
    fail "Add account for bound tests" "$(echo "$RESULT" | head -c 100)"
fi

# ============================================================================
# NOTIFY WIRING TESTS
# ============================================================================

echo ""
echo "--- Notify Wiring Tests ---"

# A notify account is only switched on once its destination is wired, so the
# two can never disagree: an enabled account the notifications service has
# never heard of looks connected and delivers nothing.
enabled_of() {
    settings_curl GET "/-/accounts/get?id=$1" | python3 -c "
import sys, json
try:
    print(json.load(sys.stdin).get('enabled', 'missing'))
except Exception:
    print('missing')
" 2>/dev/null
}

# Wired means the notifications service actually holds the account as a
# destination on a category. Not the "available destinations" list, which is
# only the account list under another name and so says yes for an account the
# service has never been told about.
wired() {
    settings_curl GET "/-/notifications/categories" | python3 -c "
import sys, json
categories = json.load(sys.stdin)
hit = any(d.get('type') == 'account' and str(d.get('target')) == '$1'
          for c in categories for d in c.get('destinations', []))
print('yes' if hit else 'no')
" 2>/dev/null
}

# A required field left empty must come back as a 400 naming the field, not as
# a 500. mochi.account.add refuses a missing required field with an error,
# Starlark cannot catch it, so the action died and mailed the operator - for a
# user who left a box blank. The email provider requires "address".
RESULT=$(settings_curl POST "/-/accounts/add" -d "type=email&label=No%20address")
CODE=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('code') or d.get('error') or '')" 2>/dev/null || true)
if echo "$RESULT" | grep -qi "required"; then
    pass "Adding an account with a required field empty is refused, not a server error"
else
    fail "Adding an account with a required field empty is refused, not a server error" "$(echo "$RESULT" | head -c 120)"
fi
if echo "$RESULT" | grep -qi "server error\|500"; then
    fail "The empty required field does not reach core as a 500" "$(echo "$RESULT" | head -c 120)"
else
    pass "The empty required field does not reach core as a 500"
fi

# Control: an add whose required field IS present still succeeds, so the two
# assertions above are not passing merely because every add is refused.
# Deliberately pushbullet (required: token) rather than email: adding an email
# account sends a verification message and spends the per-user verification
# rate limit, which on a repeated run fails the suite's own "Add email account"
# test and everything downstream of it.
RESULT=$(settings_curl POST "/-/accounts/add" -d "type=pushbullet&token=o.requiredfieldcontrol")
FILLED_ID=$(echo "$RESULT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || true)
if [ -n "$FILLED_ID" ]; then
    pass "control: an add with the required field present still succeeds"
    settings_curl POST "/-/accounts/remove" -d "id=$FILLED_ID" > /dev/null 2>&1
else
    fail "control: an add with the required field present still succeeds" "$(echo "$RESULT" | head -c 120)"
fi

RESULT=$(settings_curl POST "/-/accounts/add" -d "type=pushbullet&token=o.testwiring&add_to_existing=1")
WIRED_ID=$(echo "$RESULT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || true)
if [ -n "$WIRED_ID" ]; then
    if [ "$(enabled_of "$WIRED_ID")" = "1" ]; then
        pass "Account added with add_to_existing is enabled"
    else
        fail "Account added with add_to_existing is enabled" "enabled=$(enabled_of "$WIRED_ID")"
    fi
    if [ "$(wired "$WIRED_ID")" = "yes" ]; then
        pass "Account added with add_to_existing is wired as a destination"
    else
        fail "Account added with add_to_existing is wired as a destination" "no category holds it"
    fi
    settings_curl POST "/-/accounts/remove" -d "id=$WIRED_ID" > /dev/null 2>&1
else
    fail "Add notify account with add_to_existing" "$(echo "$RESULT" | head -c 100)"
fi

RESULT=$(settings_curl POST "/-/accounts/add" -d "type=pushbullet&token=o.testunwired&add_to_existing=0")
UNWIRED_ID=$(echo "$RESULT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || true)
if [ -n "$UNWIRED_ID" ]; then
    if [ "$(enabled_of "$UNWIRED_ID")" = "0" ]; then
        pass "Account added without add_to_existing stays disabled"
    else
        fail "Account added without add_to_existing stays disabled" "enabled=$(enabled_of "$UNWIRED_ID")"
    fi
    settings_curl POST "/-/accounts/remove" -d "id=$UNWIRED_ID" > /dev/null 2>&1
else
    fail "Add notify account without add_to_existing" "$(echo "$RESULT" | head -c 100)"
fi

echo ""
echo "--- Cleanup ---"

# Remove remaining test accounts
if [ -n "$EMAIL_ACCOUNT_ID" ]; then
    settings_curl POST "/-/accounts/remove" -d "id=$EMAIL_ACCOUNT_ID" > /dev/null 2>&1
fi

# Remove all test accounts by listing and removing. The list action answers a
# bare array; reading a "data" envelope here threw and was swallowed, so this
# cleanup silently removed nothing while still reporting success.
RESULT=$(settings_curl GET "/-/accounts/list")
ACCOUNT_IDS=$(echo "$RESULT" | python3 -c "import sys, json; [print(a['id']) for a in json.load(sys.stdin)]" 2>/dev/null || true)
for id in $ACCOUNT_IDS; do
    settings_curl POST "/-/accounts/remove" -d "id=$id" > /dev/null 2>&1
done

pass "Cleanup completed"

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "=============================================="
echo "Test Results: $PASSED passed, $FAILED failed"
echo "=============================================="

if [ "$FAILED" -gt 0 ]; then
    exit 1
fi
