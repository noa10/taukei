# G001 Reconciliation Classification

This is the worker-2 classification for `.omx/ultragoal` G001-reconciliation-boundary-contract. It decides which existing Taukei foundation artifacts should be kept as source of truth, wired through app boundaries, replaced, or deferred before production integration work.

## Classification matrix

| Area | Current artifact(s) | Decision | Rationale / next boundary |
| --- | --- | --- | --- |
| Supabase schema and generated types | `supabase/migrations/20260604001400_taukei_multi_merchant_foundation.sql`, `supabase/types/database.ts`, `supabase/seed.sql` | **Keep** | The schema already models multi-merchant ownership, RLS, fake-mode provider constraints, seeded demo data, and typed table contracts. Do not replace it while adding app-side boundaries. |
| Domain checkout/pricing ports | `packages/domain/src/services/checkout.ts`, `packages/domain/src/services/pricing.ts`, `packages/domain/src/types.ts` | **Keep** | Domain logic already distrusts client totals, computes merchant-scoped checkout drafts, and uses typed `StripePort` / `LalamovePort` abstractions. App actions should call these ports instead of duplicating pricing. |
| Fake Stripe and Lalamove adapters | `packages/domain/src/adapters/stripe.ts`, `packages/domain/src/adapters/lalamove.ts` | **Keep** | Foundation-phase adapters intentionally fail closed for live mode and expose fake/sandbox behavior for local verification. Live network adapters are out of G001 scope. |
| Web Supabase boundary | `apps/web/lib/supabase/*` | **Wire** | There is no app-local Supabase client/service boundary yet. Add minimal typed browser/server/service-role modules that fail closed without env instead of importing Supabase ad hoc from routes. |
| Merchant authentication middleware | `apps/web/middleware.ts` | **Wire** | Merchant routes currently render static stub pages. Add a narrow middleware boundary that documents the deferred auth redirect/session check without blocking demo routes. |
| Merchant catalog/fulfillment mutations | `apps/web/app/merchant/catalog/page.tsx`, `apps/web/app/merchant/fulfillment/page.tsx` | **Wire** | Pages show tenant-safe affordances but have no server-action boundary. Add typed stub actions that require `merchantId`/tenant scope and return deferred results. |
| Customer checkout mutation | `apps/web/app/mad-krapow-demo/checkout/page.tsx` | **Wire** | The page directly creates a draft with fake adapters. Add a server-action boundary for unauthenticated checkout that validates the public merchant/store/cart shape and delegates to domain checkout. |
| Stripe webhook route | none under `apps/web/app/api` | **Wire** | Add a route boundary for signature/idempotency validation and fail-closed fake/live behavior. Do not process real Stripe events yet. |
| Lalamove webhook route | none under `apps/web/app/api` | **Wire** | Add a route boundary for provider event normalization and idempotency handling. Do not book riders or mutate live delivery state yet. |
| Public design/reference HTML and screenshots | `docs/tauke-*`, `docs/DESIGN.md` | **Keep** | They remain visual/product references. They should not become runtime dependencies. |
| Static demo-only data | `apps/web/lib/demo-data.ts`, `apps/web/lib/merchant-data.ts` | **Defer** | Keep for local UI smoke tests. Replace with Supabase reads only after auth/session/read-path work is explicitly in scope. |
| Production Stripe Connect and Lalamove network calls | documented deferred work in `docs/implementation/g006-verification-and-documentation.md` | **Defer** | Current env/domain guardrails intentionally block live side effects. Production integrations need separate credentials, incident/observability, webhook replay, and reconciliation stories. |
| Existing app routes/pages | `apps/web/app/**/page.tsx` | **Keep** | The routes are verified smoke-test surfaces. Wire boundaries alongside them before replacing static rendering. |

## Boundary rules for follow-up tasks

- Keep `merchant_id` explicit at every mutation boundary; never infer cross-tenant scope from client payload alone.
- Keep unauthenticated checkout limited to public storefront/order creation assumptions; merchant operations remain auth/RLS-gated in later work.
- Keep provider side effects fake or fail-closed in G001. Webhook routes may parse/classify events but must not capture money or book riders.
- Add idempotency shape documentation before real webhook/order mutation processing.
