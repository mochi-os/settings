#!/bin/bash
# Integration test for Settings app - Apps management endpoints
# Tests system and user app preferences
#
# Prerequisites:
# - Mochi server running on localhost:8081
# - Admin and user accounts available
# - Mochi 0.3+ (multi-version apps support)
#
# Usage:
#   ./test_apps.sh

set -e

SCRIPT_DIR="$(dirname "$0")"
CURL="$SCRIPT_DIR/../../../test/claude/curl.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

pass() {
    echo -e "${GREEN}✓ $1${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TESTS_RUN=$((TESTS_RUN + 1))
}

fail() {
    echo -e "${RED}✗ $1${NC}"
    if [ -n "$2" ]; then
        echo -e "  ${YELLOW}$2${NC}"
    fi
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TESTS_RUN=$((TESTS_RUN + 1))
}

# Check if feature is available
check_available() {
    RESPONSE=$("$CURL" /settings/system/apps/available)
    AVAILABLE=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('available', False))" 2>/dev/null || echo "false")

    if [ "$AVAILABLE" != "True" ]; then
        echo -e "${RED}Multi-version apps not available (requires Mochi 0.3+)${NC}"
        echo "Response: $RESPONSE"
        exit 1
    fi
    pass "Multi-version apps available"
}

echo "========================================"
echo "Settings App - Apps Management Tests"
echo "========================================"
echo ""

# ----------------------------------------
# Check feature availability
# ----------------------------------------
echo "--- Feature Availability ---"
check_available

# ----------------------------------------
# System Apps Tests (Admin)
# ----------------------------------------
echo ""
echo "--- System Apps (Admin) ---"

# Test: List all apps
RESPONSE=$("$CURL" /settings/system/apps/list)
if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); assert 'apps' in d" 2>/dev/null; then
    APP_COUNT=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d['apps']))" 2>/dev/null)
    pass "List apps (found $APP_COUNT apps)"
else
    fail "List apps" "$RESPONSE"
fi

# Get first app ID for further tests
APP_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['apps'][0]['id'] if d['apps'] else '')" 2>/dev/null || echo "")

if [ -n "$APP_ID" ]; then
    # Test: Get app details
    RESPONSE=$("$CURL" "/settings/system/apps/get?app=$APP_ID")
    if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); assert d.get('app') == '$APP_ID'" 2>/dev/null; then
        VERSIONS=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('versions', [])))" 2>/dev/null)
        pass "Get app details ($APP_ID has $VERSIONS versions)"
    else
        fail "Get app details" "$RESPONSE"
    fi
else
    fail "No apps found to test"
fi

# Test: Get routing
RESPONSE=$("$CURL" /settings/system/apps/routing)
if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); assert 'classes' in d and 'services' in d and 'paths' in d" 2>/dev/null; then
    pass "Get routing configuration"
else
    fail "Get routing" "$RESPONSE"
fi

# Test: Cleanup (should work even if nothing to clean)
RESPONSE=$("$CURL" -X POST /settings/system/apps/cleanup)
if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); assert 'removed' in d" 2>/dev/null; then
    REMOVED=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['removed'])" 2>/dev/null)
    pass "Cleanup unused versions (removed: $REMOVED)"
else
    fail "Cleanup" "$RESPONSE"
fi

# ----------------------------------------
# User Apps Tests (User)
# ----------------------------------------
echo ""
echo "--- User Apps (User) ---"

# Check if user account exists
USER_TOKEN=$("$SCRIPT_DIR/../../../test/claude/get-token.sh" user 1 2>/dev/null || echo "")
if [ -z "$USER_TOKEN" ]; then
    echo -e "${YELLOW}○ Skipping user tests (no user account available)${NC}"
    echo -e "${YELLOW}  Create a non-admin user to run these tests${NC}"
else

# Test: Get user apps data
RESPONSE=$("$CURL" -a user /settings/user/apps/data)
if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); assert 'apps' in d and 'versions' in d" 2>/dev/null; then
    pass "Get user apps data"
else
    fail "Get user apps data" "$RESPONSE"
fi

# Test: Set user app version (then clear it)
if [ -n "$APP_ID" ]; then
    # Get available versions for this app
    FIRST_VERSION=$(echo "$RESPONSE" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for app in d['apps']:
    if app['id'] == '$APP_ID' and app.get('versions'):
        print(app['versions'][0])
        break
" 2>/dev/null || echo "")

    if [ -n "$FIRST_VERSION" ]; then
        # Set version preference
        RESPONSE=$("$CURL" -a user -X POST -d "app=$APP_ID&version=$FIRST_VERSION" /settings/user/apps/version/set)
        if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); assert d.get('ok')" 2>/dev/null; then
            pass "Set user app version preference"
        else
            fail "Set user app version preference" "$RESPONSE"
        fi

        # Verify it was set
        RESPONSE=$("$CURL" -a user /settings/user/apps/data)
        if echo "$RESPONSE" | python3 -c "
import sys, json
d = json.load(sys.stdin)
v = d.get('versions', {}).get('$APP_ID', {})
assert v.get('version') == '$FIRST_VERSION'
" 2>/dev/null; then
            pass "Verify user version preference set"
        else
            fail "Verify user version preference" "$RESPONSE"
        fi

        # Clear the preference
        RESPONSE=$("$CURL" -a user -X POST -d "app=$APP_ID&version=&track=" /settings/user/apps/version/set)
        if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); assert d.get('ok')" 2>/dev/null; then
            pass "Clear user version preference"
        else
            fail "Clear user version preference" "$RESPONSE"
        fi
    else
        echo -e "${YELLOW}○ Skipping version preference tests (no versions available)${NC}"
    fi
fi

# Test: Reset all user preferences
RESPONSE=$("$CURL" -a user -X POST /settings/user/apps/reset)
if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); assert d.get('ok')" 2>/dev/null; then
    pass "Reset all user preferences"
else
    fail "Reset user preferences" "$RESPONSE"
fi

# ----------------------------------------
# Access Control Tests
# ----------------------------------------
echo ""
echo "--- Access Control ---"

# Test: Non-admin cannot access system endpoints
RESPONSE=$("$CURL" -a user /settings/system/apps/list 2>&1)
if echo "$RESPONSE" | grep -q "403\|forbidden\|unauthorized\|admin" 2>/dev/null || \
   echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); assert d.get('status') in [401, 403] or 'admin' in d.get('error', '').lower()" 2>/dev/null; then
    pass "Non-admin blocked from system/apps/list"
else
    fail "Non-admin should be blocked from system endpoints" "$RESPONSE"
fi

RESPONSE=$("$CURL" -a user -X POST /settings/system/apps/cleanup 2>&1)
if echo "$RESPONSE" | grep -q "403\|forbidden\|unauthorized\|admin" 2>/dev/null || \
   echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); assert d.get('status') in [401, 403] or 'admin' in d.get('error', '').lower()" 2>/dev/null; then
    pass "Non-admin blocked from system/apps/cleanup"
else
    fail "Non-admin should be blocked from cleanup" "$RESPONSE"
fi

fi  # End of user tests (if USER_TOKEN exists)

# ----------------------------------------
# Summary
# ----------------------------------------
echo ""
echo "========================================"
echo "Test Results"
echo "========================================"
echo -e "Tests run:    ${TESTS_RUN}"
echo -e "Passed:       ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Failed:       ${RED}${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed${NC}"
    exit 1
fi
