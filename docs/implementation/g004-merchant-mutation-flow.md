# G004 Merchant Mutation Flow

## Scope

This story wires merchant onboarding/profile defaults, catalog item updates, and fulfillment status transitions through tenant-safe mutation boundaries. Because this checkout has no linked Supabase project/config, the mutation repository returns explicit `stubbed` persistence evidence while still producing Supabase-shaped payloads and rejecting unsafe writes before any future persistence layer.

## Delivered artifacts

- `apps/web/lib/merchant-mutations.ts`
  - `upsertMerchantProfileDefaults` builds a `stores` upsert payload for onboarding/profile defaults.
  - `upsertCatalogItem` builds `menu_items` mutation payloads with tenant and price validation.
  - `transitionFulfillmentStatus` builds `fulfillment_events` payloads with legal status-transition validation.
  - Cross-tenant merchant IDs are rejected through the G003 session guard.
- `apps/web/lib/merchant-mutations.test.ts`
  - Proves tenant rejection, catalog value checks, legal/illegal fulfillment transitions, and actor user capture.
- `apps/web/app/merchant/actions.ts`
  - Server actions now call mutation helpers instead of returning free-form placeholder strings.
- Merchant pages display mutation boundary previews:
  - `apps/web/app/merchant/onboarding/page.tsx`
  - `apps/web/app/merchant/catalog/page.tsx`
  - `apps/web/app/merchant/fulfillment/page.tsx`

## Legal fulfillment transitions

Current local contract:

- `new -> accepted | cancelled`
- `accepted -> preparing | cancelled`
- `preparing -> ready_for_pickup | cancelled`
- `ready_for_pickup -> out_for_delivery`
- `out_for_delivery -> delivered | cancelled`
- terminal: `delivered`, `cancelled`

## Verification

Commands run for G004:

```sh
bun run lint
bun run typecheck
bun run test
bun run build
bun run smoke:merchant
```

## Known gaps

- No remote Supabase writes were executed because the repo has no linked Supabase project/config.
- Mutations are intentionally `stubbed` locally but are typed as Supabase table payloads for later persistence wiring.
- Git commits are unavailable because this checkout has no `.git` directory.
