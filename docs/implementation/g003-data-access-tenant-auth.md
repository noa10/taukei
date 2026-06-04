# G003 Data Access and Tenant/Auth Wiring

## Scope

This story centralizes Taukei's app-side Supabase access boundaries without enabling live remote Supabase mutations. It keeps `.omx/ultragoal` leader-owned and preserves the first-tranche no-live-side-effect constraint.

## Delivered boundaries

- `apps/web/lib/data-access.ts`
  - Single repository-style read surface for public storefront, checkout seed data, order tracking, and merchant operations context.
  - Returns explicit evidence for whether data is coming from the local stub or a configured RLS Supabase boundary.
  - Keeps route/page code from reaching directly into Supabase or duplicating tenant scoping logic.
- `apps/web/lib/supabase/session.ts`
  - Defines the local merchant demo session contract.
  - Provides `assertMerchantTenantScope` so merchant mutations/pages reject cross-tenant access before any write helper runs.
  - Documents the current `stubbed-local` auth mode and future `supabase-rls` expectation.
- `apps/web/lib/supabase/service.ts`
  - Constrains service-role access to explicit webhook callers only.
  - Adds `assertWebhookServiceRoleCaller` to reject accidental cross-provider service-role use.
- Existing pages/actions/webhook routes now call the centralized helpers instead of scattering tenant/session checks.

## Wired surfaces

- Customer storefront and checkout:
  - `apps/web/app/mad-krapow-demo/page.tsx`
  - `apps/web/app/mad-krapow-demo/checkout/actions.ts`
- Customer order tracking:
  - `apps/web/app/order/TK-DEMO-1001/page.tsx`
- Merchant operations:
  - `apps/web/app/merchant/page.tsx`
  - `apps/web/app/merchant/catalog/page.tsx`
  - `apps/web/app/merchant/fulfillment/page.tsx`
  - `apps/web/app/merchant/onboarding/page.tsx`
  - `apps/web/app/merchant/login/page.tsx`
  - `apps/web/app/merchant/actions.ts`
- Webhook service-role boundaries:
  - `apps/web/app/api/webhooks/stripe/route.ts`
  - `apps/web/app/api/webhooks/lalamove/route.ts`

## Tenant-safety evidence

`apps/web/lib/data-access.test.ts` proves:

1. Public storefront reads go through one repository helper.
2. Cross-tenant merchant operations are rejected before mutation helpers run.
3. Service-role boundaries are confined to webhook callers.

## Verification

Commands run for G003:

```sh
bun run lint
bun run typecheck
bun run test
bun run build
bun run smoke
bun run smoke:customer
bun run smoke:merchant
```

## Known gaps

- This story does not apply remote Supabase migrations or create production auth sessions.
- The app still uses seeded local data when Supabase env vars are absent; the boundary evidence makes that explicit.
- Git commits are unavailable because this checkout has no `.git` directory.
