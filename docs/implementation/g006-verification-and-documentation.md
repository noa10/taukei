# G006 Verification and Documentation

## Verification run

Full command output is stored in `docs/verification/g006-verification-20260604T042408Z.log`.

Fresh verification passed on 2026-06-04T04:24:08Z:

- `bun run schema:validate`
  - migration and seed applied to temporary PostgreSQL
  - 14 required public tables found
  - RLS enabled on all 14 tables
  - seed order `TK-DEMO-1001` generated `total_cents = 3100`
  - seeded payment/delivery modes are `fake`
  - fake-provider live payment insert rejected as expected
- `bun run lint`
- `bun run typecheck`
  - web app
  - env package
  - domain package
  - schema types
- `bun run test`
  - 12 tests passed
  - 37 assertions
- `bun run build`
  - 12 static pages generated, including customer and merchant routes
- `bun run smoke`
  - startup and integration safety smoke passed
- `bun run smoke:customer`
  - storefront, checkout, and tracking returned no-live-side-effect content
- `bun run smoke:merchant`
  - login, onboarding, catalog, fulfillment, and tenant-safety content returned

## Mad Krapow reuse/adaptation decisions

Taukei intentionally reuses product patterns from the Mad Krapow reference domain, not code copied wholesale:

- Reused/adapted:
  - Food ordering concepts: storefront, menu, cart, checkout, fulfillment dashboard, order tracking.
  - Thai basil bowl demo content as a seeded merchant to prove customer and merchant flows.
  - Stripe/Lalamove as integration categories, but behind typed ports and fake/sandbox adapters.
  - Kitchen prep buffer and fragile-item delivery routing concepts.
- Changed for Taukei:
  - Multi-merchant schema is first-class; every merchant-owned table carries `merchant_id` and tenant policies.
  - Public storefront reads are separated from merchant mutations with RLS policies.
  - Customer and merchant flows are web/PWA first, not native-app-first.
  - Integration safety is fail-closed by default; live adapters are not implemented in this foundation.
  - Taukei is canonical public brand/copy, while `mad-krapow-demo` remains only a demo merchant slug.

## Deferred production work

These items are explicitly deferred and not hidden behind the current green checks:

- Production Stripe payment movement and Stripe Connect onboarding.
- Live Lalamove quotation/order booking and webhook handling.
- Supabase Auth session wiring for real merchant login.
- Real Supabase client queries/mutations from UI routes.
- Native customer or merchant apps.
- Real map/location autocomplete and live tracking.
- Pixel-perfect visual polish against all PNG references.
- Deployment, production secrets, observability, and incident controls.

## No-live-side-effect evidence

- `.env.example` defaults to fake modes.
- `@taukei/env` tests fail closed for live modes without explicit production authorization and credentials.
- `@taukei/domain` adapter factories reject live Stripe/Lalamove adapters in this foundation.
- Customer checkout imports `FakeStripeAdapter` and `FakeLalamoveAdapter` directly.
- Smoke tests assert fake provider/no-live-side-effect content.
- Schema validation asserts fake provider live insert is rejected.
