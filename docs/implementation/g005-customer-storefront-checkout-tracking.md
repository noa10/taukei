# G005 Customer Storefront, Checkout, and Tracking Flow

## Scope

This story wires the customer path through Supabase-shaped records while preserving the no-live-side-effect first tranche. Because this checkout has no linked Supabase project/config, records are built in a local persistence boundary and explicitly marked `stubbed-demo` unless Supabase env is configured.

## Delivered artifacts

- `apps/web/lib/customer-orders.ts`
  - Validates public checkout against the trusted catalog and merchant/store boundary.
  - Builds Supabase-shaped `orders`, `order_items`, `payment_sessions`, and `delivery_jobs` records from the domain checkout draft.
  - Emits tracking events from checkout, payment, delivery, and fulfillment sources.
- `apps/web/lib/customer-orders.test.ts`
  - Proves trusted-catalog validation, record creation, no-live-payment/no-live-booking metadata, and tracking event exposure.
- `apps/web/app/mad-krapow-demo/checkout/actions.ts`
  - Server action returns checkout records as well as the domain draft.
- `apps/web/app/mad-krapow-demo/checkout/page.tsx`
  - Displays order/item/payment/delivery record evidence.
- `apps/web/app/order/TK-DEMO-1001/page.tsx`
  - Renders tracking events from the generated record set.

## Safety

- Client unit prices remain ignored by domain pricing.
- Unknown/unavailable cart items are rejected before record creation.
- Payment and delivery records carry `mode = fake`, `noLivePayment`, and `noLiveBooking` metadata.
- Remote Supabase writes are not attempted without an explicit linked project/config.

## Verification

Commands run for G005:

```sh
bun run lint
bun run typecheck
bun run test
bun run build
bun run smoke:customer
```

## Known gaps

- Records are Supabase-shaped local boundary objects, not remote Supabase inserts, because the repo has no linked Supabase project/config.
- Git commits are unavailable because this checkout has no `.git` directory.

## 2026-06-04 Team execution evidence

OMX team `g005-ultragoal-story-771d309d` completed all 3 tasks with 0 pending, 0 in-progress, and 0 failed tasks before shutdown.

### Task evidence

- Worker 1 completed storefront/menu + checkout trusted-catalog wiring:
  - `apps/web/lib/customer-orders.ts` now centralizes trusted checkout request construction and always replaces caller-supplied catalog data with the server demo catalog before pricing/order record creation.
  - `apps/web/app/mad-krapow-demo/checkout/actions.ts` now delegates validation to the central checkout boundary instead of keeping duplicate shallow validation.
  - `apps/web/lib/customer-orders.test.ts` covers empty/tampered request catalogs and ignored client unit prices.
- Worker 2 completed tracking/status regression and smoke evidence:
  - `apps/web/lib/customer-orders.test.ts` locks tracking event sources, statuses, labels, and no-live payload metadata.
  - `scripts/smoke-customer-flow.sh` verifies storefront, checkout, order tracking labels, and no-live payment/delivery content.

### Leader verification

The leader reran the full G005 verification gate after worker completion:

```sh
bun run lint
bun run typecheck
bun run test        # 24 pass, 81 expects
bun run build       # pass; Next.js middleware deprecation warning only
bun run smoke:customer
```

### Ultragoal reconciliation note

A fresh `get_goal` snapshot matched the aggregate `.omx/ultragoal/goals.json` objective, but the Codex goal status was `paused` instead of `active`. `omx ultragoal checkpoint --status complete` therefore could not safely complete `G005-customer-storefront-checkout-tracking` without mutating Codex goal state. Safe recovery is to resume/unpause the matching aggregate Codex goal context and rerun the G005 checkpoint with a fresh active `get_goal` snapshot.
