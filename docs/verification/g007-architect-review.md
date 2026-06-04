Architectural Status: CLEAR

## Independent architect lane evidence

- Acted as a read-only architecture/devil’s-advocate lane: inspected the current filesystem directly under `/Users/khairulanwar/dev/taukei`; made no edits and did not rely on git metadata.
- Scope reviewed: `apps/`, `packages/`, `scripts/`, `supabase/`, `package.json`, `tsconfig.schema.json`, `.env.example`, and `docs/implementation/`.
- I treated `docs/verification/g006-verification-20260604T042408Z.log` as verification evidence only, not implementation.

## Architecture assessment

No unresolved architectural blocker found. The current implementation is a safe foundation/skeleton rather than production-ready commerce, and the important boundaries are explicit enough for this phase:

- Single Next.js web/PWA foundation exists via root workspace scripts and `apps/web` app routing.
  - `package.json:7-23`
  - `apps/web/app/layout.tsx:4-22`
  - `apps/web/app/manifest.ts:3-20`
- Supabase multi-merchant schema is tenant-aware with `merchant_id`, same-merchant composite constraints, and RLS enabled.
  - `supabase/migrations/20260604001400_taukei_multi_merchant_foundation.sql:41-62`
  - `supabase/migrations/20260604001400_taukei_multi_merchant_foundation.sql:64-108`
  - `supabase/migrations/20260604001400_taukei_multi_merchant_foundation.sql:121-155`
  - `supabase/migrations/20260604001400_taukei_multi_merchant_foundation.sql:304-317`
  - `supabase/migrations/20260604001400_taukei_multi_merchant_foundation.sql:319-375`
- Domain services isolate pricing/checkout from provider side effects through ports/adapters.
  - `packages/domain/src/types.ts:119-128`
  - `packages/domain/src/services/checkout.ts:21-65`
  - `packages/domain/src/adapters/stripe.ts:37-43`
  - `packages/domain/src/adapters/lalamove.ts:58-64`
- Live payment and rider-booking are fail-closed and visibly deferred.
  - `.env.example:1-11`
  - `packages/env/src/index.ts:36-49`
  - `packages/domain/src/adapters/stripe.ts:39-40`
  - `packages/domain/src/adapters/lalamove.ts:60-61`
  - `docs/implementation/g006-verification-and-documentation.md:50-61`
- Customer and merchant flows are intentionally skeleton/stub surfaces, not hidden production flows.
  - `apps/web/app/mad-krapow-demo/checkout/page.tsx:10-20`
  - `apps/web/app/order/TK-DEMO-1001/page.tsx:29-32`
  - `apps/web/app/merchant/login/page.tsx:9-15`
  - `apps/web/app/merchant/fulfillment/page.tsx:23-24`

## Strongest counterargument against approving as-is

The main architectural concern is that the domain checkout boundary currently accepts a caller-supplied `catalog` directly:

- `CheckoutRequest.catalog` is part of the request shape: `packages/domain/src/types.ts:56-64`
- Pricing indexes that catalog by item id only: `packages/domain/src/services/pricing.ts:16-23`
- Checkout passes the provided catalog straight into pricing: `packages/domain/src/services/checkout.ts:24-25`

That is acceptable for a foundation where the catalog is documented as “trusted,” but it is the biggest future maintainability/tenant-safety risk: when real Supabase queries are wired, the architecture needs a clear repository/service boundary that fetches catalog snapshots by `merchant_id`/`store_id` server-side. Otherwise, future code could accidentally treat client-provided or incorrectly scoped catalog data as trusted.

I do **not** consider this a blocker for the current scope because production Supabase client queries/mutations are explicitly deferred in `docs/implementation/g006-verification-and-documentation.md:54-58`, and the current UI uses seeded local demo data rather than pretending to be production persistence.

## Concrete recommendations

1. **Before production checkout wiring, introduce a tenant-scoped catalog repository boundary.**  
   Shape should be closer to: `loadCheckoutCatalog({ merchantId, storeId, itemIds })`, returning server-trusted `MenuItemSnapshot[]`. Keep `priceCartFromCatalog` pure, but do not let route/UI code provide arbitrary catalog snapshots in production.

2. **Make tenant scope a first-class checkout invariant.**  
   Add a future domain assertion that every priced item snapshot belongs to `request.merchantId`. The schema already models this with same-merchant foreign keys, but the in-memory domain service should eventually mirror the invariant.

3. **Keep live integration enablement as a separate production milestone.**  
   Current env guards and adapter factories are good. Do not replace fake/sandbox adapters with live implementations behind the same simple switch without adding production authorization, webhook, idempotency, reconciliation, observability, and incident-control design.

4. **Avoid letting static demo merchant data become the app architecture.**  
   `apps/web/lib/demo-data.ts` and `apps/web/lib/merchant-data.ts` are useful seed surfaces, but future work should move toward route-level server loaders/repositories rather than expanding these files into a shadow data layer.

5. **Preserve the explicit deferred-work list.**  
   The docs are clear that green checks do not imply production payment, rider booking, real Supabase Auth, real mutations, maps/tracking, deployment, or observability. That clarity is an architectural strength and should remain part of release gates.

## Verification evidence reviewed

- Schema validation applied migration/seed, found 14 tables, RLS on 14 tables, fake integrations, and rejected fake-provider live payment insert:
  - `docs/verification/g006-verification-20260604T042408Z.log:4-30`
- Lint/typecheck/test/build passed:
  - `docs/verification/g006-verification-20260604T042408Z.log:32-82`
- Build generated customer and merchant static routes:
  - `docs/verification/g006-verification-20260604T042408Z.log:85-96`
- Startup/customer/merchant smoke checks passed:
  - `docs/verification/g006-verification-20260604T042408Z.log:102-113`

Conclusion: architecture is clear enough for the stated foundation scope. Deferred production work is explicit rather than hidden. No architecture blocker remains.