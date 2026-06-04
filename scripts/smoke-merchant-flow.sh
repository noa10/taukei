#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="${TMPDIR:-/tmp}/taukei-merchant-smoke.log"
HTML_DIR="$(mktemp -d "${TMPDIR:-/tmp}/taukei-merchant-smoke.XXXXXX")"
PID=""
cleanup() {
  if [[ -n "${PID}" ]]; then kill "$PID" >/dev/null 2>&1 || true; wait "$PID" 2>/dev/null || true; fi
  rm -rf "$HTML_DIR"
}
trap cleanup EXIT
cd "$ROOT_DIR"
PORT="${TAUKEI_MERCHANT_SMOKE_PORT:-3102}"
bun --cwd apps/web next dev --port "$PORT" >"$LOG_FILE" 2>&1 &
PID=$!
for _ in $(seq 1 30); do
  if ! kill -0 "$PID" 2>/dev/null; then cat "$LOG_FILE" >&2; exit 1; fi
  if curl -fsS "http://localhost:${PORT}/merchant" >"$HTML_DIR/dashboard.html" 2>/dev/null; then break; fi
  sleep 1
done
curl -fsS "http://localhost:${PORT}/merchant/login" >"$HTML_DIR/login.html"
curl -fsS "http://localhost:${PORT}/merchant/onboarding" >"$HTML_DIR/onboarding.html"
curl -fsS "http://localhost:${PORT}/merchant/catalog" >"$HTML_DIR/catalog.html"
curl -fsS "http://localhost:${PORT}/merchant/fulfillment" >"$HTML_DIR/fulfillment.html"
grep -q "Taukei merchant command center" "$HTML_DIR/dashboard.html"
grep -q "Stub auth" "$HTML_DIR/login.html"
grep -q "Profile, kitchen, logistics" "$HTML_DIR/onboarding.html"
grep -q "Catalog CRUD" "$HTML_DIR/catalog.html"
grep -q "merchant:00000000-0000-4000-8000-000000000001" "$HTML_DIR/catalog.html"
grep -q "fake_stripe" "$HTML_DIR/fulfillment.html"
grep -q "fake_lalamove" "$HTML_DIR/fulfillment.html"
grep -q "Tenant-safety check" "$HTML_DIR/fulfillment.html"
echo "Taukei merchant flow smoke passed: login, onboarding, catalog, fulfillment, and tenant-safety content returned."
