# G001 Reconciliation Boundary Contract

## Purpose

This contract reconciles the existing Taukei repository artifacts against the active OMX Ultragoal `G001-reconciliation-boundary-contract` while preserving the handoff rule that `.omx/ultragoal/goals.json` and `.omx/ultragoal/ledger.jsonl` are leader-owned state.

Workers may inspect and cite `.omx/ultragoal` as goal context, but must not checkpoint it, create worker ledgers, mutate goal JSON, or represent shell/team API calls as Codex goal state changes. Worker completion evidence belongs in team task lifecycle results and repo-local documentation.

## Source-of-truth boundaries

| Boundary | Owned by | Current repo evidence | Worker contract |
| --- | --- | --- | --- |
| Ultragoal state | Leader | `.omx/ultragoal/goals.json`, `.omx/ultragoal/ledger.jsonl`, `.omx/ultragoal/brief.md` | Read/cite only. Do not edit, checkpoint, or create parallel Ultragoal state. |
| Team task lifecycle | OMX team runtime | `${OMX_TEAM_STATE_ROOT}/team/ultragoal-g001-reconc-e7eccfeb/tasks/task-*.json` | Claim and transition tasks only through `omx team api`. |
| Product/design evidence | Repository docs | `docs/DESIGN.md`, `docs/taukeplan.md`, `docs/tauke-*/*/screen.png`, implementation docs G001-G006, verification G007 | Add reconciliation artifacts under `docs/` only. |
| Runtime app shell | Web app | `apps/web/app`, `apps/web/components`, `apps/web/lib` | Keep demo/stub UI explicit; do not imply production side effects. |
| Domain boundaries | Shared package | `packages/domain/src/services`, `packages/domain/src/adapters`, `packages/domain/tests` | Preserve port/adapters separation and fake/sandbox/live mode semantics. |
| Environment safety | Shared package | `packages/env/src/index.ts`, `packages/env/tests` | Preserve fail-closed live integration guards. |
| Data boundary | Supabase artifacts | `supabase/migrations`, `supabase/seed.sql`, `supabase/types/database.ts`, `scripts/validate-supabase-schema.sh` | Treat migration/types as schema contract; no remote Supabase changes from worker tasks. |
| Verification | Local scripts/docs | root `package.json` scripts, `scripts/smoke-*.sh`, `docs/verification/*` | Report fresh command evidence or explicit execution gaps. |

## Reconciled implementation surface

### Keep as current foundation

- Bun workspace root with `apps/web`, `packages/domain`, and `packages/env`.
- Next.js App Router pages for landing, customer demo checkout, order tracking, and merchant operations.
- Supabase SQL migration, seed, generated TypeScript shape, and local validation script.
- Domain pricing/checkout services with Stripe and Lalamove ports plus fake adapters.
- Fail-closed environment loader for live Stripe/Lalamove modes.
- Existing G001-G007 implementation and verification documentation.

### Wire only through explicit boundary work

- Real Supabase client/server helpers, middleware, actions, and webhook routes should be introduced as explicit boundary artifacts rather than hidden inside UI pages.
- Stripe and Lalamove production paths should remain behind live-mode guards and explicit production-integration approval.
- Merchant/customer persistence should flow through Supabase tenant/RLS contracts, not in-memory demo data, when that story is started.

### Replace only with verified behavior lock

- Generated/reference HTML under `docs/tauke-*/*/code.html` should not become app source without deliberate extraction and regression evidence.
- Demo data under `apps/web/lib/*-data.ts` should not be silently promoted to production persistence.
- Existing fake adapter behavior should not be replaced by live network calls in foundation/reconciliation work.

### Defer by contract

- Live Stripe payment capture.
- Live Lalamove rider booking.
- Remote Supabase migrations or production data changes.
- Native mobile apps.
- Runtime checkout/webhook idempotency execution beyond current local foundation.

## Checkout and idempotency boundary

Current customer checkout is an unauthenticated storefront/demo assumption: customers can browse a public merchant storefront and create a local stub checkout without a Supabase auth session. Merchant operations remain tenant/member scoped in the schema contract, but customer checkout persistence must be introduced through explicit server-side boundary modules rather than by trusting browser totals or demo data.

When checkout persistence is wired, use an idempotency boundary before any payment, delivery, or order mutation side effect:

| Table / boundary | Suggested key fields | Purpose | Contract |
| --- | --- | --- | --- |
| `checkout_idempotency_keys` | `merchant_id`, `store_id`, `idempotency_key`, `request_hash`, `order_id`, `status`, `expires_at`, `created_at`, `updated_at` | De-duplicate unauthenticated customer checkout submissions. | Unique on `(merchant_id, idempotency_key)`; reject mismatched `request_hash`; expire abandoned attempts. |
| `webhook_idempotency_events` | `provider`, `event_id`, `event_type`, `received_at`, `processed_at`, `status`, `payload_hash`, `error_message` | De-duplicate Stripe/Lalamove webhook deliveries. | Unique on `(provider, event_id)`; processing must be idempotent and replay-safe. |
| `order_side_effect_locks` | `order_id`, `effect_type`, `provider`, `provider_reference`, `status`, `created_at`, `updated_at` | Prevent duplicate payment/delivery side effects per order. | Unique on `(order_id, effect_type)` before invoking provider adapters. |

No current worker task should create remote tables or enable live provider side effects. The table shapes above are documentation for the future Supabase migration/server-action story and must be reconciled with RLS, webhook signature verification, and provider retry semantics before production use.

## Guardrails for follow-on workers

1. Mention `.omx/ultragoal` and `G001-reconciliation-boundary-contract` in evidence, but do not mutate `.omx/ultragoal`.
2. Use `omx team api claim-task` and `transition-task-status` for team lifecycle; do not edit task lifecycle fields manually.
3. Add repo evidence under `docs/implementation` or `docs/verification` unless a task explicitly scopes code changes.
4. Prefer tests before behavior-changing edits. Current relevant gates are `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`, `bun run smoke`, and `bun run schema:validate`.
5. Treat all live payment/delivery/Supabase remote operations as out of scope unless a leader-approved production integration task explicitly authorizes them.

## Acceptance evidence for this contract

- Contract lives outside `.omx/ultragoal`, so leader-owned goal files are not modified by this worker.
- Contract names the repo-local surfaces that can be safely audited or changed by follow-on tasks.
- Contract separates current foundation, wiring candidates, replacement candidates, and deferred production work.
