# G008 production guardrails for final architect review

## Purpose

This artifact resolves the final architect WATCH findings without enabling live provider side effects. It makes the current foundation boundaries explicit so future work cannot mistake deterministic local evidence for horizontally safe production persistence.

## Current status: foundation-only, not production-live

The current Taukei implementation is intentionally a deterministic local foundation:

- Stripe and Lalamove webhook processors are deterministic fake/sandbox adapters.
- Accepted webhook results carry `noLiveSideEffect: true` and provider-specific no-live reconciliation flags.
- Live provider payloads and live integration modes fail closed.
- Supabase-shaped records and boundary objects prove contracts locally, but do not yet perform remote Supabase writes in customer, merchant, or webhook paths.
- In-memory webhook idempotency maps are acceptable only for local deterministic tests and single-process demo evidence.

## Hard guardrails before live or horizontally scaled use

These requirements are blockers for any future live/provider production rollout:

1. **Replace in-memory webhook idempotency with atomic Supabase persistence**
   - Current maps in `apps/web/lib/webhooks/stripe.ts` and `apps/web/lib/webhooks/lalamove.ts` must be removed or bypassed for live/horizontal runtime.
   - The replacement must insert/upsert `public.webhook_events` atomically using the existing unique constraints on `(provider, event_id)` and `(provider, idempotency_key)`.
   - Duplicate provider events must be decided by the database transaction, not process memory.

2. **Do not treat boundary-shaped Supabase evidence as production persistence**
   - `apps/web/lib/data-access.ts`, `apps/web/lib/customer-orders.ts`, and `apps/web/lib/merchant-mutations.ts` return Supabase-shaped records and boundary metadata for local verification.
   - Production persistence requires explicit repository/server-action work that calls Supabase through RLS-scoped clients or isolated service-role helpers.
   - Any future claim of remote persistence must include before/after Supabase evidence, generated types, RLS checks, and integration tests.

3. **Keep service-role client construction private to webhook persistence helpers**
   - Routes may identify the allowed caller and assert the boundary, but must not construct or expose service-role clients directly.
   - Future service-role writes should live behind dedicated webhook persistence helpers that own idempotency, request hashing, event status transitions, and error evidence.
   - Service-role helpers must stay confined to Stripe/Lalamove webhook callers unless a new reviewed boundary explicitly expands the caller set.

4. **No flag-only production rollout**
   - Enabling `live` mode is not sufficient to go production-live.
   - Live rollout requires a separate approved story with remote Supabase config, atomic idempotency persistence, production secret handling, provider signature verification, replay tests, and rollback/observability evidence.

## Evidence anchors

- In-memory deterministic idempotency maps: `apps/web/lib/webhooks/stripe.ts`, `apps/web/lib/webhooks/lalamove.ts`.
- Durable schema target: `supabase/migrations/20260604001400_taukei_multi_merchant_foundation.sql` (`public.webhook_events`, uniqueness, live-mode guard, RLS policies).
- Supabase boundary helpers: `apps/web/lib/supabase/config.ts`, `apps/web/lib/supabase/service.ts`.
- Local boundary-shaped data paths: `apps/web/lib/data-access.ts`, `apps/web/lib/customer-orders.ts`, `apps/web/lib/merchant-mutations.ts`.
- Verification: `scripts/validate-supabase-schema.sh`, webhook route/processor tests, customer/merchant smoke tests.

## Acceptance criteria for this guardrail

- Future modifiers can see that current webhook idempotency is process-local and non-production.
- Future modifiers can see that Supabase-shaped evidence is not remote persistence evidence.
- Future modifiers can see that service-role writes must be isolated behind webhook persistence helpers.
- The final architect review can downgrade the previous WATCH items to acknowledged, documented, non-blocking constraints because production-live/horizontal use is explicitly gated.
