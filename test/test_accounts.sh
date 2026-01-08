#!/bin/bash
# Connected Accounts Test Suite
# Tests the mochi.account.* API through the settings app endpoints
# Usage: ./test_accounts.sh

set -e

SCRIPT_DIR="$(dirname "$0")"
CURL_HELPER="/home/alistair/mochi/test/claude/curl.sh"

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
if echo "$RESULT" | python3 -c "import sys, json; providers = json.load(sys.stdin)['data']; email = next(p for p in providers if p['type'] == 'email'); sys.exit(0 if email['verify'] else 1)" 2>/dev/null; then
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
    ACCOUNT_ID=$(echo "$RESULT" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
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
if echo "$RESULT" | python3 -c "import sys, json; accounts = json.load(sys.stdin)['data']; pb = next(a for a in accounts if a['type'] == 'pushbullet'); sys.exit(0 if pb['verified'] > 0 else 1)" 2>/dev/null; then
    pass "Pushbullet account immediately verified"
else
    fail "Pushbullet account immediately verified" "$RESULT"
fi

# Test: Add email account (requires verification)
RESULT=$(settings_curl POST "/-/accounts/add" -d "type=email&address=test@example.com&label=Test Email")
if echo "$RESULT" | grep -q '"type":"email"' && echo "$RESULT" | grep -q '"identifier":"test@example.com"'; then
    EMAIL_ACCOUNT_ID=$(echo "$RESULT" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
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
if echo "$RESULT" | python3 -c "import sys, json; accounts = json.load(sys.stdin)['data']; email = next(a for a in accounts if a['type'] == 'email'); sys.exit(0 if email['verified'] == 0 else 1)" 2>/dev/null; then
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
if echo "$RESULT" | grep -q '"error"' || echo "$RESULT" | grep -q 'unknown'; then
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

echo ""
echo "--- Cleanup ---"

# Remove remaining test accounts
if [ -n "$EMAIL_ACCOUNT_ID" ]; then
    settings_curl POST "/-/accounts/remove" -d "id=$EMAIL_ACCOUNT_ID" > /dev/null 2>&1
fi

# Remove all test accounts by listing and removing
RESULT=$(settings_curl GET "/-/accounts/list")
ACCOUNT_IDS=$(echo "$RESULT" | python3 -c "import sys, json; [print(a['id']) for a in json.load(sys.stdin).get('data', [])]" 2>/dev/null || true)
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
