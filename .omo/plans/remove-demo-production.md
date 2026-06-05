# Work Plan: Remove All Demo Content - Production Ready

## Goal
Remove ALL demo content from the React web application and prepare it for full production mode with no demo.

## User Decisions
- Home page (`/`) → Merchant landing page (marketing page for merchants to sign up)
- Supabase seed data (`supabase/seed.sql`) → Remove completely

## File Operations Summary

### DELETE (13 files)
| File | Reason |
|------|--------|
| `apps/web/lib/demo-data.ts` | Core demo merchant, catalog, checkout request |
| `apps/web/lib/merchant-data.ts` | Demo merchant session, seeded catalog, fulfillment orders |
| `apps/web/app/mad-krapow-demo/page.tsx` | Demo storefront page |
| `apps/web/app/mad-krapow-demo/checkout/page.tsx` | Demo checkout page |
| `apps/web/app/mad-krapow-demo/checkout/actions.ts` | Demo checkout server action |
| `apps/web/app/order/TK-DEMO-1001/page.tsx` | Demo order tracking page |
| `apps/web/app/merchant/page.tsx` | Merchant dashboard |
| `apps/web/app/merchant/onboarding/page.tsx` | Merchant onboarding |
| `apps/web/app/merchant/catalog/page.tsx` | Merchant catalog management |
| `apps/web/app/merchant/fulfillment/page.tsx` | Merchant fulfillment dashboard |
| `apps/web/app/merchant/login/page.tsx` | Merchant login |
| `apps/web/app/merchant/actions.ts` | Merchant server actions (demo-bound) |
| `supabase/seed.sql` | Demo seed data |

### MODIFY (9 files)
| File | Changes |
|------|---------|
| `apps/web/app/page.tsx` | Transform to merchant landing page; remove demo links |
| `apps/web/lib/data-access.ts` | Replace demo imports with real Supabase queries; remove stub functions |
| `apps/web/lib/customer-orders.ts` | Remove demo catalog validation; use real catalog from Supabase |
| `apps/web/lib/supabase/session.ts` | Remove `getDemoMerchantSession()`; use real Supabase auth |
| `apps/web/lib/webhooks/stripe.test.ts` | Update/remove tests using demo data |
| `apps/web/lib/webhooks/lalamove.test.ts` | Update/remove tests using demo data |
| `apps/web/lib/data-access.test.ts` | Remove demo tests |
| `apps/web/lib/merchant-mutations.test.ts` | Update for production merchant mutations |
| `apps/web/lib/customer-orders.test.ts` | Update for production checkout |

### KEEP (Production infrastructure - 15 files)
- `apps/web/components/primitives.tsx`
- `apps/web/app/layout.tsx`
- `apps/web/app/manifest.ts`
- `apps/web/app/globals.css`
- `apps/web/next.config.ts`
- `apps/web/lib/supabase/config.ts`
- `apps/web/lib/supabase/server.ts`
- `apps/web/lib/supabase/client.ts`
- `apps/web/lib/supabase/service.ts`
- `apps/web/lib/supabase/index.ts`
- `apps/web/app/api/webhooks/stripe/route.ts`
- `apps/web/app/api/webhooks/lalamove/route.ts`
- `packages/domain/src/types.ts`
- `supabase/migrations/20260604001400_taukei_multi_merchant_foundation.sql`
- `packages/env/`

## Detailed Work Items

### Phase 1: Rewrite Core Library Consumers (Parallel)
- [x] Rewrite `apps/web/lib/data-access.ts` - remove demo imports, implement real Supabase queries
- [x] Rewrite `apps/web/lib/customer-orders.ts` - remove demo imports, use real catalog from Supabase
- [x] Rewrite `apps/web/lib/supabase/session.ts` - remove `getDemoMerchantSession()`, use real Supabase auth + RLS
- [x] Fix `apps/web/lib/merchant-mutations.ts` - remove demo imports, make session required

### Phase 2: Delete Demo Files (Parallel, after Phase 1)
- [x] Delete `apps/web/lib/demo-data.ts`
- [x] Delete `apps/web/lib/merchant-data.ts`
- [x] Delete `apps/web/app/mad-krapow-demo/` directory (recursive)
- [x] Delete `apps/web/app/order/TK-DEMO-1001/` directory (recursive)
- [x] Delete `apps/web/app/merchant/` directory (recursive)
- [x] Delete `supabase/seed.sql`

### Phase 3: Transform Home Page (can run parallel with Phase 2)
- [x] Rewrite `apps/web/app/page.tsx` as merchant landing page
- [x] Remove imports from `demo-data` and `primitives` ButtonLink (use native `<a>` or new CTA component)
- [x] Add merchant-focused marketing content (value prop, features, CTA to sign up)
- [x] Keep design system tokens and layout

### Phase 4: Update Tests (after Phases 1-2)
- [x] Update `apps/web/lib/webhooks/stripe.test.ts` - remove demo dependencies
- [x] Update `apps/web/lib/webhooks/lalamove.test.ts` - remove demo dependencies
- [x] Update `apps/web/lib/data-access.test.ts` - rewrite for production queries
- [x] Update `apps/web/lib/merchant-mutations.test.ts` - test real mutations
- [x] Update `apps/web/lib/customer-orders.test.ts` - test real checkout flow

### Phase 5: Verify Build & Lint
- [x] Run `npm run build` in `apps/web`
- [x] Run `npm run lint` in `apps/web`
- [x] Run `npm run typecheck` in `apps/web`
- [x] Verify no demo imports remain anywhere in codebase
- [x] Verify no routes exist under `/mad-krapow-demo`, `/order/TK-DEMO-*`, `/merchant/*`
- [x] Verify home page (`/`) renders merchant landing page with sign-up CTA
- [x] Verify webhook endpoints functional for production
- [x] Verify Supabase migrations unchanged
- [x] Verify real auth/RLS flow works (merchant session from Supabase auth)

## Acceptance Criteria
1. No files reference `demo-data`, `merchant-data`, or demo merchant UUIDs
2. No routes exist under `/mad-krapow-demo`, `/order/TK-DEMO-*`, `/merchant/*`
3. Home page (`/`) renders a merchant landing page with sign-up CTA
4. `npm run build` passes with zero errors
5. `npm run lint` passes with zero warnings
6. `npm run typecheck` passes with zero errors
7. Webhook endpoints remain functional for production
8. Supabase migrations unchanged (production schema intact)
9. Real merchant session from Supabase auth + RLS (no stubbed sessions)
10. Seed data removed from Supabase (not just file)

## Dependencies & Order
- Phase 1 (rewrite consumers) MUST complete before Phase 2 (delete providers)
- Phase 3 (home page) can run in parallel with Phase 2
- Phase 4 (tests) depends on Phases 1-2
- Phase 5 (verify) depends on all previous phases

## Risk Mitigation
- Keep Supabase migrations - they define production schema
- Webhook endpoints are production-ready, don't modify
- Domain types are shared, don't modify
- Rewrite consumers BEFORE deleting providers to avoid broken build
- Test changes incrementally after each phase
- Verify RLS policies work with real auth flow