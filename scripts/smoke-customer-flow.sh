#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="${TMPDIR:-/tmp}/taukei-customer-smoke.log"
HTML_DIR="$(mktemp -d "${TMPDIR:-/tmp}/taukei-customer-smoke.XXXXXX")"
PID=""
cleanup() {
  if [[ -n "${PID}" ]]; then
    kill "$PID" >/dev/null 2>&1 || true
    wait "$PID" 2>/dev/null || true
  fi
  rm -rf "$HTML_DIR"
}
trap cleanup EXIT
cd "$ROOT_DIR"
PORT="${TAUKEI_CUSTOMER_SMOKE_PORT:-3101}"
bun --cwd apps/web next dev --port "$PORT" >"$LOG_FILE" 2>&1 &
PID=$!
for _ in $(seq 1 30); do
  if ! kill -0 "$PID" 2>/dev/null; then
    cat "$LOG_FILE" >&2
    exit 1
  fi
  if curl -fsS "http://localhost:${PORT}/mad-krapow-demo" >"$HTML_DIR/storefront.html" 2>/dev/null; then
    break
  fi
  sleep 1
done
curl -fsS "http://localhost:${PORT}/mad-krapow-demo/checkout" >"$HTML_DIR/checkout.html"
curl -fsS "http://localhost:${PORT}/order/TK-DEMO-1001" >"$HTML_DIR/order.html"
grep -q "Mad Krapow Demo" "$HTML_DIR/storefront.html"
grep -q "Cart preview" "$HTML_DIR/storefront.html"
grep -q "fake_stripe" "$HTML_DIR/checkout.html"
grep -q "fake_lalamove" "$HTML_DIR/order.html"
grep -q "Order confirmed" "$HTML_DIR/order.html"
grep -q "Payment stubbed" "$HTML_DIR/order.html"
grep -q "Delivery scheduled" "$HTML_DIR/order.html"
grep -q "Kitchen preparing" "$HTML_DIR/order.html"
grep -q "does not move money or book riders" "$HTML_DIR/order.html"
echo "Taukei customer flow smoke passed: storefront, checkout, and order tracking returned no-live-side-effect content."
