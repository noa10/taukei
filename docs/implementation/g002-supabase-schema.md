# G002 Supabase Multi-Merchant Schema

## Scope

This story creates the Supabase data foundation for Taukei's multi-merchant web/PWA platform. It covers schema, RLS, seed data, typed database shapes, and local validation evidence. It does not implement runtime domain services, UI flows, or live provider adapters; those remain in later Ultragoal stories.

## Artifacts

- Migration: `supabase/migrations/20260604001400_taukei_multi_merchant_foundation.sql`
- Seed data: `supabase/seed.sql`
- TypeScript DB types: `supabase/types/database.ts`
- Schema typecheck config: `tsconfig.schema.json`
- Local validation script: `scripts/validate-supabase-schema.sh`

## Model coverage

The migration defines 16 tenant-aware/auth-linked public tables:

1. `merchants`
2. `profiles`
3. `merchant_memberships`
4. `stores`
5. `menus`
6. `menu_categories`
7. `menu_items`
8. `customers`
9. `orders`
10. `order_items`
11. `payment_sessions`
12. `delivery_quotes`
13. `delivery_jobs`
14. `delivery_events`
15. `fulfillment_events`
16. `webhook_events`

It also defines enums for merchant status, merchant roles, membership status, store status, order status, fulfillment status, payment status, delivery status, and integration mode.

## Multi-merchant/RLS review

- Merchant-owned tables carry `merchant_id` and use composite tenant foreign keys where cross-table references need tenant consistency.
- `profiles` links Supabase Auth users to Taukei profile metadata and optional default merchant.
- `merchant_memberships` maps Supabase `auth.uid()` users to merchant roles through `profiles`.
- Helper functions `current_merchant_ids`, `is_merchant_member`, and `is_merchant_admin` centralize tenant checks.
- RLS is enabled on all 16 tables, including `profiles` and `webhook_events`.
- Public storefront reads are limited to active/open/public stores, active menus/categories, and available items.
- Merchant mutation policies require membership or admin status, depending on table sensitivity.

## Safe integration review

- Seeded payment and delivery records use `mode = 'fake'` and providers `fake_stripe` / `fake_lalamove`.
- Foundation-phase check constraints reject `mode = 'live'` on payment sessions, delivery quotes, delivery jobs, and webhook events regardless of provider string.
- The validation script explicitly attempts fake-provider live payment, non-fake live payment, and live delivery rows and expects check-constraint rejection for all three.
- Production Stripe payment movement and live Lalamove booking remain deferred to later explicit integration work.

## Validation

`bun run schema:validate` starts a temporary local PostgreSQL instance, creates a small Supabase-compatible `auth.uid()` shim, applies the migration, applies the seed, and verifies:

- 14 required public tables exist.
- RLS is enabled on all 16 tables, including `profiles` and `webhook_events`.
- Demo seed order `TK-DEMO-1001` exists with generated `total_cents = 3100`.
- Seeded payment and delivery modes are `fake`.
- Fake-provider live payment, non-fake live payment, and live delivery insertions are rejected by foundation-phase check constraints.

Additional repo validation:

```sh
bun run typecheck:schema
bun run schema:validate
bun run lint
bun run typecheck
bun run test
bun run build
```


## G002 hardening delta

This pass reconciles the original foundation schema with the full-platform E2E plan requirement for auth linkage and webhook idempotency:

- Added `public.profiles` with `auth.users(id)` linkage, self-read/write RLS, and `default_merchant_id` for merchant context selection.
- Added `public.webhook_events` for Stripe/Lalamove/fake provider event receipt, idempotency keys, request hashes, replay responses, and processing status.
- Added uniqueness constraints for provider event IDs and idempotency keys so duplicate webhook delivery can be detected before side effects.
- Kept live side effects disabled with `webhook_live_disabled_in_foundation` plus the existing payment/delivery live-mode guards.
- Updated seed data and validation to exercise profiles, webhook events, RLS visibility, and live webhook rejection.

Remote Supabase apply/generate was not performed from this local run; `scripts/validate-supabase-schema.sh` remains the authoritative local migration replay and typecheck gate until credentials/project apply is explicitly authorized.
