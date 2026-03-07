#!/bin/bash
# Interests API Test Suite
# Tests negative interest weights (-100 to 100) through the settings app
# Usage: ./test_interests.sh
#
# Uses QIDs Q99990001-Q99990005 to avoid conflicting with real interests.

set -e

CURL_HELPER="/home/alistair/mochi/claude/scripts/curl.sh"

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

# Helper to make settings requests
settings_curl() {
    local method="$1"
    local path="$2"
    shift 2
    "$CURL_HELPER" -a admin -X "$method" "$@" "/settings$path"
}

# Helper to extract field from interest list by QID
get_weight() {
    local qid="$1"
    local json="$2"
    echo "$json" | python3 -c "
import sys, json
interests = json.load(sys.stdin).get('interests', [])
matches = [i for i in interests if i['qid'] == '$qid']
print(matches[0]['weight'] if matches else 'missing')
" 2>/dev/null
}

has_qid() {
    local qid="$1"
    local json="$2"
    echo "$json" | python3 -c "
import sys, json
interests = json.load(sys.stdin).get('interests', [])
print('yes' if any(i['qid'] == '$qid' for i in interests) else 'no')
" 2>/dev/null
}

# Test QIDs (high numbers to avoid collision)
QA="Q99990001"
QB="Q99990002"
QC="Q99990003"
QD="Q99990004"
QE="Q99990005"

echo "=============================================="
echo "Interests API Test Suite"
echo "=============================================="

# ============================================================================
# CLEANUP — remove test QIDs if they exist from a prior run
# ============================================================================

for qid in $QA $QB $QC $QD $QE; do
    settings_curl POST "/-/user/interests/remove" -d "qid=$qid" > /dev/null 2>&1 || true
done

# ============================================================================
# SET INTEREST TESTS
# ============================================================================

echo ""
echo "--- Set Interest Tests ---"

# Test: Set a positive interest
RESULT=$(settings_curl POST "/-/user/interests/set" -d "qid=$QA&weight=75")
if echo "$RESULT" | grep -q '"ok":true'; then
    pass "Set positive interest (weight=75)"
else
    fail "Set positive interest" "$RESULT"
fi

# Test: Set a zero-weight interest
RESULT=$(settings_curl POST "/-/user/interests/set" -d "qid=$QB&weight=0")
if echo "$RESULT" | grep -q '"ok":true'; then
    pass "Set zero interest (weight=0)"
else
    fail "Set zero interest" "$RESULT"
fi

# Test: Set a negative interest
RESULT=$(settings_curl POST "/-/user/interests/set" -d "qid=$QC&weight=-50")
if echo "$RESULT" | grep -q '"ok":true'; then
    pass "Set negative interest (weight=-50)"
else
    fail "Set negative interest" "$RESULT"
fi

# Test: Set interest at -100 (minimum)
RESULT=$(settings_curl POST "/-/user/interests/set" -d "qid=$QD&weight=-100")
if echo "$RESULT" | grep -q '"ok":true'; then
    pass "Set interest at minimum (-100)"
else
    fail "Set interest at minimum" "$RESULT"
fi

# Test: Reject weight below -100
RESULT=$(settings_curl POST "/-/user/interests/set" -d "qid=$QE&weight=-101")
if echo "$RESULT" | grep -q 'Error 400\|"error"'; then
    pass "Reject weight below -100"
else
    fail "Reject weight below -100" "$RESULT"
fi

# Test: Reject weight above 100
RESULT=$(settings_curl POST "/-/user/interests/set" -d "qid=$QE&weight=101")
if echo "$RESULT" | grep -q 'Error 400\|"error"'; then
    pass "Reject weight above 100"
else
    fail "Reject weight above 100" "$RESULT"
fi

# ============================================================================
# LIST INTEREST TESTS
# ============================================================================

echo ""
echo "--- List Interest Tests ---"

RESULT=$(settings_curl GET "/-/user/interests")

# Test: List includes positive interest with correct weight
W=$(get_weight "$QA" "$RESULT")
if [ "$W" = "75" ]; then
    pass "List includes positive interest (weight=75)"
else
    fail "List includes positive interest" "Expected 75, got $W"
fi

# Test: List includes negative interest with correct weight
W=$(get_weight "$QC" "$RESULT")
if [ "$W" = "-50" ]; then
    pass "List includes negative interest (weight=-50)"
else
    fail "List includes negative interest" "Expected -50, got $W"
fi

# Test: List includes zero-weight interest
W=$(get_weight "$QB" "$RESULT")
if [ "$W" = "0" ]; then
    pass "List includes zero interest (weight=0)"
else
    fail "List includes zero interest" "Expected 0, got $W"
fi

# Test: List includes -100 interest
W=$(get_weight "$QD" "$RESULT")
if [ "$W" = "-100" ]; then
    pass "List includes minimum interest (weight=-100)"
else
    fail "List includes minimum interest" "Expected -100, got $W"
fi

# ============================================================================
# UPDATE WEIGHT TESTS
# ============================================================================

echo ""
echo "--- Update Weight Tests ---"

# Test: Update a positive interest to negative
RESULT=$(settings_curl POST "/-/user/interests/set" -d "qid=$QA&weight=-30")
if echo "$RESULT" | grep -q '"ok":true'; then
    RESULT=$(settings_curl GET "/-/user/interests")
    W=$(get_weight "$QA" "$RESULT")
    if [ "$W" = "-30" ]; then
        pass "Update positive to negative (75 -> -30)"
    else
        fail "Update positive to negative" "Expected -30, got $W"
    fi
else
    fail "Update positive to negative" "$RESULT"
fi

# Test: Update a negative interest to positive
RESULT=$(settings_curl POST "/-/user/interests/set" -d "qid=$QC&weight=80")
if echo "$RESULT" | grep -q '"ok":true'; then
    RESULT=$(settings_curl GET "/-/user/interests")
    W=$(get_weight "$QC" "$RESULT")
    if [ "$W" = "80" ]; then
        pass "Update negative to positive (-50 -> 80)"
    else
        fail "Update negative to positive" "Expected 80, got $W"
    fi
else
    fail "Update negative to positive" "$RESULT"
fi

# ============================================================================
# REMOVE INTEREST TESTS
# ============================================================================

echo ""
echo "--- Remove Interest Tests ---"

# Test: Remove negative interest
RESULT=$(settings_curl POST "/-/user/interests/remove" -d "qid=$QD")
if echo "$RESULT" | grep -q '"ok":true'; then
    RESULT=$(settings_curl GET "/-/user/interests")
    HAS=$(has_qid "$QD" "$RESULT")
    if [ "$HAS" = "no" ]; then
        pass "Remove negative interest"
    else
        fail "Remove negative interest" "Still exists after removal"
    fi
else
    fail "Remove negative interest" "$RESULT"
fi

# ============================================================================
# CLEANUP
# ============================================================================

echo ""
echo "--- Cleanup ---"

for qid in $QA $QB $QC $QD $QE; do
    settings_curl POST "/-/user/interests/remove" -d "qid=$qid" > /dev/null 2>&1 || true
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
