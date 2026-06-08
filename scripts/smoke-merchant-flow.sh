#!/usr/bin/env bash
set -euo pipefail

echo "🧪 Taukei Merchant Dashboard Smoke Tests"
echo "=========================================="

BASE_URL="${BASE_URL:-http://localhost:56778}"
FAIL=0

check_route() {
  local route="$1"
  local name="$2"
  local expected="$3"
  local url="${BASE_URL}${route}"

  echo -n "  Checking ${name} (${route}) ... "
  
  local body
  body=$(curl -s -L "$url" --max-time 8 || echo "")
  
  if [ -z "$body" ]; then
    echo "❌ FAILED (no response)"
    FAIL=$((FAIL + 1))
    return
  fi

  if echo "$body" | grep -q "$expected"; then
    echo "✅ PASS"
  else
    echo "❌ FAILED (missing: ${expected})"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "1️⃣  Route Smoke Tests"
check_route "/merchant" "Merchant Dashboard" "Dashboard"
check_route "/merchant/login" "Merchant Login" "Merchant Login"
check_route "/merchant/onboarding" "Merchant Onboarding" "Onboarding"
check_route "/merchant/catalog" "Merchant Catalog" "Menu Catalog"
check_route "/merchant/fulfillment" "Merchant Fulfillment" "Fulfillment"

echo ""
echo "2️⃣  Tenant-Safety Assertions"
check_route "/merchant" "Tenant ID on Dashboard" "00000000-0000-4000-8000-000000000001"
check_route "/merchant/login" "Tenant ID on Login" "00000000"
check_route "/merchant/onboarding" "Tenant ID on Onboarding" "00000000-0000-4000-8000-000000000001"
check_route "/merchant/fulfillment" "Tenant ID on Fulfillment" "00000000-0000-4000-8000-000000000001"

echo ""
echo "3️⃣  Fake Provider Strings"
check_route "/merchant/fulfillment" "Stripe fake provider" "Stripe"
check_route "/merchant/fulfillment" "Lalamove fake provider" "Lalamove"

echo ""
echo "4️⃣  Functional Elements"
check_route "/merchant/onboarding" "Onboarding form" "Save Profile"
check_route "/merchant/catalog" "Add Item button" "Add Item"
check_route "/merchant/fulfillment" "Order status badges" "New"
check_route "/merchant/fulfillment" "Order status badges" "Accepted"

echo ""
echo "=========================================="
if [ $FAIL -eq 0 ]; then
  echo "✅ All ${TOTAL_CHECKS:-12} smoke tests passed!"
  exit 0
else
  echo "❌ ${FAIL} smoke test(s) failed"
  exit 1
fi
