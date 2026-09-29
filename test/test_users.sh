#!/bin/bash
# Copyright © 2026 Mochisoft OÜ
# SPDX-License-Identifier: AGPL-3.0-only
# This file is part of Mochi, licensed under the GNU AGPL v3 with the
# Mochi Application Interface Exception - see license.txt and license-exception.md.

# System Users Test Suite
# Tests the administrator's user actions through the settings app endpoints
# Usage: ./test_users.sh

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

echo "=============================================="
echo "System Users Test Suite"
echo "=============================================="

# ============================================================================
# STEP-UP ON CREATE
# ============================================================================

echo ""
echo "--- Step-up on create ---"

# Creating an administrator grants a privilege, so it takes a step-up proof
# like promoting one does; without one it is refused and nobody is created.
USERNAME="stepup-$(date +%s)-$$@example.com"
RESULT=$(settings_curl POST "/-/system/users/create" -d "username=$USERNAME&role=administrator")
if echo "$RESULT" | grep -q '"uid"'; then
    fail "Create an administrator without a step-up proof" "created: $RESULT"
elif echo "$RESULT" | grep -qi 're-\?authentication'; then
    pass "Create an administrator without a step-up proof is refused"
else
    fail "Create an administrator without a step-up proof" "unexpected answer: $RESULT"
fi

RESULT=$(settings_curl POST "/-/system/users/list" -d "search=$USERNAME")
if echo "$RESULT" | grep -q "$USERNAME"; then
    fail "Refused administrator was not created" "found: $RESULT"
else
    pass "Refused administrator was not created"
fi

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "=============================================="
echo "Results: $PASSED passed, $FAILED failed"
echo "=============================================="

[ "$FAILED" -eq 0 ]
