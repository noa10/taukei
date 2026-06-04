# G005 Merchant Operations Flow

## Scope

This story implements the local/stubbed merchant operations slice: login/session, onboarding/profile/kitchen/logistics defaults, catalog CRUD basics, and fulfillment dashboard order status basics. It remains tenant-scoped demo UI; production Supabase Auth mutations are deferred.

## Artifacts

- `apps/web/lib/merchant-data.ts` — stub merchant session, profile/defaults, catalog drafts, fulfillment orders.
- `apps/web/app/merchant/page.tsx` — merchant dashboard.
- `apps/web/app/merchant/login/page.tsx` — local stub auth surface.
- `apps/web/app/merchant/onboarding/page.tsx` — profile/kitchen/logistics defaults.
- `apps/web/app/merchant/catalog/page.tsx` — seeded menu CRUD affordances with tenant-safe mutation copy.
- `apps/web/app/merchant/fulfillment/page.tsx` — order queue/status actions with fake payment/delivery providers.
- `scripts/smoke-merchant-flow.sh` — route smoke coverage and tenant-safety assertions.

## Tenant-safety notes

The merchant pages render only the demo merchant id `00000000-0000-4000-8000-000000000001` under `merchant:00000000-0000-4000-8000-000000000001`. Catalog and fulfillment pages explicitly show tenant scope so future Supabase mutations keep `merchant_id` as a required boundary.

## Verification

`bun run smoke:merchant` checks dashboard, login, onboarding, catalog, fulfillment, fake provider strings, and tenant-safety copy.
