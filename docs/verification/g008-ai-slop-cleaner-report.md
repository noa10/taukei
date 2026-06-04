# G008 AI slop cleanup report

Scope: changed guardrail files only:

- `apps/web/lib/data-access.ts`
- `apps/web/lib/customer-orders.ts`
- `apps/web/lib/merchant-mutations.ts`
- `apps/web/lib/webhooks/production-guardrails.ts`
- `apps/web/lib/webhooks/stripe.ts`
- `apps/web/lib/webhooks/lalamove.ts`
- related regression tests in `apps/web/lib/**/*.test.ts`

Behavior lock: targeted regression tests were added/run for data-access evidence, customer checkout records, merchant mutation boundaries, Stripe webhook processing, and Lalamove webhook processing before cleanup review. The full repo verification also passed before this pass.

Cleanup plan:

1. Keep the pass bounded to G008 guardrail files.
2. Search for misleading production/persistence labels and fallback-like language.
3. Prefer explicit evidence labels over new abstractions.
4. Avoid dependencies and live side effects.
5. Rerun targeted/full verification after the pass.

Fallback findings:

- In-process webhook idempotency maps are fallback-like only in the sense that they are local deterministic demo storage. Classification: grounded foundation-only fail-safe boundary, not masking fallback slop, because live payloads/modes are rejected and regression tests assert no-live-side-effect evidence.
- Supabase configured-mode labels previously risked implying real persistence (`persisted`, `supabase-persistence-boundary`). Classification: masking terminology risk. Action: replaced with explicit non-persistence evidence (`remotePersistence: false`, boundary labels, production guardrail messages) and regression assertions.
- No swallowed errors, silent network fallbacks, broad compatibility shims, or alternate live paths found in the scoped files.

Passes completed:

- Fallback-like code resolution gate: misleading persistence labels repaired; process-local idempotency now carries explicit production guardrail evidence.
1. Dead code deletion: no dead code found in scoped files.
2. Duplicate removal: no safe duplicate-removal target; provider-specific webhook branches intentionally remain separate for signature/reconciliation clarity.
3. Naming/error handling cleanup: renamed evidence/status labels away from production persistence claims.
4. Test reinforcement: added assertions for `remotePersistence: false` and webhook production guardrail metadata.

Quality gates:

- Regression tests: PASS — targeted G008 test set passed (19 tests).
- Lint: PASS — pre-clean full verification passed.
- Typecheck: PASS — pre-clean full verification passed.
- Tests: PASS — pre-clean full verification passed (38 tests).
- Build/static check: PASS — pre-clean Next build passed; no security scanner is configured in this repo.

Changed files:

- `apps/web/lib/data-access.ts` — read evidence now states configured Supabase is an RLS read boundary, not remote persistence.
- `apps/web/lib/customer-orders.ts` — checkout record set now exposes Supabase-shaped local evidence with `remotePersistence: false`.
- `apps/web/lib/merchant-mutations.ts` — configured mutation boundary status no longer says `persisted`; all results carry non-persistence guardrails.
- `apps/web/lib/webhooks/production-guardrails.ts` — centralized constants/types for process-local webhook idempotency and service-role confinement guardrails.
- `apps/web/lib/webhooks/stripe.ts` — webhook processing results include production guardrail metadata.
- `apps/web/lib/webhooks/lalamove.ts` — webhook processing results include production guardrail metadata.
- Tests above — regression coverage for the guardrails.

Remaining risks:

- Production-live/horizontal webhook handling is still intentionally deferred until a separate story implements atomic Supabase `webhook_events` persistence and remote integration evidence.
