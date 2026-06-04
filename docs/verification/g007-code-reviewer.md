CODE REVIEW REPORT
==================

Independent lane evidence: reviewed as the installed OMX `code-reviewer` role for code/spec/security quality only. I did not take architectural ownership and made no code changes.

Files Reviewed: 50 scoped files
- `apps/`: Next.js app routes, UI primitives, demo/merchant data, config, CSS/PWA files.
- `packages/`: env validation, domain pricing/checkout, fake Stripe/Lalamove ports, tests.
- `scripts/`: smoke and schema validation scripts.
- `supabase/`: migration, seed, generated DB types.
- Root/config: `package.json`, `.env.example`, `tsconfig.schema.json`.
- `docs/implementation/`: reviewed as implementation narrative.
- `docs/verification/g006-verification-20260604T042408Z.log`: used as evidence only, not implementation.

Validation evidence reviewed:
- Verification log reports passing `schema:validate`, lint, typecheck, 12 tests / 37 assertions, build, startup smoke, customer smoke, merchant smoke.
- I did not re-run commands because this review lane is operating in a read-only filesystem sandbox.

Total Issues: 5

CRITICAL (0)
------------
(none)

HIGH (0)
--------
(none)

MEDIUM (3)
----------

1. `supabase/migrations/20260604001400_taukei_multi_merchant_foundation.sql:171`, `:190`, `:210`, `:362-369`  
   Issue: The schema only blocks `mode = 'live'` when paired with fake provider names, but still permits merchant members to create live-mode payment/delivery rows using non-fake provider strings.  
   Risk: The current app has no live adapters, so this does not move money or book riders today. However, it weakens the foundation’s fail-closed invariant and creates a dangerous future footgun if later workers trust DB rows as integration intent.  
   Fix: For this foundation phase, add explicit constraints such as `mode in ('fake', 'sandbox')` on `payment_sessions`, `delivery_quotes`, and `delivery_jobs`, or restrict live rows to a future service-role-only migration/function. Add schema validation that attempts live non-fake inserts and expects rejection until production integration is deliberately enabled.

2. `packages/domain/src/services/checkout.ts:24`, `packages/domain/src/services/pricing.ts:16`, `:57-58`, `:67`  
   Issue: Domain pricing accepts `platformFeeCents` and `deliveryFeeCents` without non-negative safe-integer validation. `createCheckoutDraft` forwards `request.platformFeeCents` directly into pricing options.  
   Risk: If a future route/API exposes `CheckoutRequest` to client input, a negative or unsafe fee can reduce totals or produce nonsensical payment amounts. Current demo data is static and safe, so this is not presently exploitable through the UI.  
   Fix: Validate all monetary inputs as non-negative safe integers before totals are computed. Reject negative fees, non-safe integers, and unrealistic quantities. Add tests for negative platform fee, negative delivery fee, and overflow-scale quantities.

3. `scripts/validate-supabase-schema.sh:39-58`, `:68-75`  
   Issue: Schema validation confirms table count, RLS enabled count, seed rows, fake modes, and one fake-provider live guard, but does not exercise actual RLS allow/deny behavior.  
   Risk: A policy can exist and RLS can be enabled while cross-tenant access, unauthenticated public reads, or role-specific writes are still wrong. Multi-merchant isolation is a core requirement.  
   Fix: Extend validation with JWT-subclaim simulation for at least: anonymous storefront read allowed only for open/public catalog; anonymous orders/customers denied; merchant A member denied merchant B orders/items; staff vs admin membership mutation behavior; live-mode non-fake rows denied during foundation.

LOW (2)
-------

1. `scripts/smoke-customer-flow.sh:16-25`, `scripts/smoke-merchant-flow.sh:13-22`  
   Issue: Smoke tests start `bun run dev` but always curl `localhost:3000`. If port 3000 is already occupied, Next may bind another port while the smoke test hits a stale server on 3000.  
   Risk: False positive/negative smoke results in local development or CI.  
   Fix: Reserve a known free port and pass it to Next via `PORT`, fail if that exact port cannot be bound, and curl that explicit port.

2. `apps/web/components/primitives.tsx:7-8`  
   Issue: `ButtonLink` accepts arbitrary `href` strings. Current call sites are static internal routes, but the primitive has no guard if reused with user-controlled URLs later.  
   Risk: Future misuse could allow unsafe schemes or open redirect-style navigation surfaces.  
   Fix: Either constrain this primitive to internal paths (`href.startsWith("/")`) or split into `InternalButtonLink` and a separately reviewed external-link component with scheme validation and `rel` handling.

SECURITY / QUALITY NOTES
------------------------
- No hardcoded live secrets found. `.env.example` contains empty placeholders only.
- No `dangerouslySetInnerHTML`, `eval`, `new Function`, or dynamic shell execution found.
- React-rendered dynamic values are escaped by default.
- Fake Stripe/Lalamove adapters do not perform network calls and live adapter factories throw.
- Supabase schema enables RLS on all 14 public tables and uses tenant foreign keys consistently in the main model.
- The implementation is small, readable, and mostly well-separated between env, domain, UI, scripts, and Supabase artifacts.

TEST ADEQUACY
-------------
Adequate for current foundation skeleton:
- Env live-mode guard tests.
- Domain pricing/checkout/fake adapter tests.
- Schema load/seed/constraint validation.
- Static route build and smoke coverage for customer and merchant flows.

Gaps to address before production-facing integration:
- Real RLS behavior tests, not just RLS-enabled counts.
- Negative/overflow monetary input tests.
- Explicit “no live non-fake integration rows in foundation mode” schema tests.
- Smoke tests isolated from port collisions/stale servers.

FIX RECOMMENDATIONS
-------------------
1. Add foundation-phase DB constraints denying all `live` integration modes until a future production integration migration deliberately loosens them.
2. Harden domain money validation with non-negative safe-integer checks and tests.
3. Expand Supabase validation to simulate auth identities and prove tenant isolation.
4. Make smoke scripts use an explicit reserved port.
5. Guard or narrow `ButtonLink` before it is reused with non-static hrefs.

Approval recommendation: APPROVE