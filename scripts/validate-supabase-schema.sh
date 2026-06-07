#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# validate-supabase-schema.sh — smoke test that required Supabase tables and
# columns exist in the local or linked Supabase instance.
#
# Requires: supabase CLI, jq
#
# Usage:
#   ./scripts/validate-supabase-schema.sh
#   ./scripts/validate-supabase-schema.sh --project-ref abc123
# ---------------------------------------------------------------------------

set -euo pipefail

DB_URL="${SUPABASE_DB_URL:-}"
PROJECT_REF=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --project-ref) PROJECT_REF="$2"; shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

# If no DB_URL and we have a project ref, construct it
if [[ -z "$DB_URL" && -n "$PROJECT_REF" ]]; then
  echo "Falling back to supabase CLI for project $PROJECT_REF"
  DB_URL=$(supabase status --project-ref "$PROJECT_REF" 2>/dev/null | grep "DB URL" | awk '{print $3}' || true)
fi

# Default: use the local supabase stack
if [[ -z "$DB_URL" ]]; then
  DB_URL=$(supabase status 2>/dev/null | grep "DB URL" | awk '{print $3}' || true)
fi

if [[ -z "$DB_URL" ]]; then
  echo "ERROR: Could not determine database URL. Start the Supabase local stack with 'supabase start' or pass --project-ref."
  exit 1
fi

echo "Validating Supabase schema against $DB_URL ..."

PASS=0
FAIL=0

function check_table() {
  local table="$1"
  local result
  result=$(psql "$DB_URL" -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');")
  if [[ "$result" == "t" ]]; then
    echo "  ✓ Table public.$table exists"
    ((PASS++))
  else
    echo "  ✗ Table public.$table does NOT exist"
    ((FAIL++))
  fi
}

function check_column() {
  local table="$1"
  local column="$2"
  local result
  result=$(psql "$DB_URL" -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$table' AND column_name = '$column');")
  if [[ "$result" == "t" ]]; then
    echo "  ✓ Column $table.$column exists"
    ((PASS++))
  else
    echo "  ✗ Column $table.$column does NOT exist"
    ((FAIL++))
  fi
}

function check_function() {
  local fn="$1"
  local result
  result=$(psql "$DB_URL" -tAc "SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = '$fn');")
  if [[ "$result" == "t" ]]; then
    echo "  ✓ Function public.$fn() exists"
    ((PASS++))
  else
    echo "  ✗ Function public.$fn() does NOT exist"
    ((FAIL++))
  fi
}

function check_bucket() {
  local bucket="$1"
  local result
  result=$(psql "$DB_URL" -tAc "SELECT EXISTS (SELECT 1 FROM storage.buckets WHERE id = '$bucket');")
  if [[ "$result" == "t" ]]; then
    echo "  ✓ Storage bucket '$bucket' exists"
    ((PASS++))
  else
    echo "  ✗ Storage bucket '$bucket' does NOT exist"
    ((FAIL++))
  fi
}

echo ""
echo "Tables:"
check_table "profiles"
check_table "merchant_memberships"

echo ""
echo "Columns (profiles):"
check_column "profiles" "id"
check_column "profiles" "email"
check_column "profiles" "username"
check_column "profiles" "full_name"
check_column "profiles" "display_name"
check_column "profiles" "avatar_url"

echo ""
echo "Functions:"
check_function "handle_new_user"

echo ""
echo "Storage:"
check_bucket "avatars"

echo ""
echo "$PASS passed, $FAIL failed"
if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
