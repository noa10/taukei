# G001 Taukei Artifact Audit

## Scope

This audit supports OMX Ultragoal `G001-reconciliation-boundary-contract` by classifying existing Taukei design/art/reference artifacts without checkpointing or mutating `.omx/ultragoal` leader-owned state.

## Inventory summary

- Product/design docs: `docs/DESIGN.md`, `docs/taukeplan.md`, duplicated high-energy commerce design docs under customer and merchant folders.
- Brand art: `docs/taukelogo.png` and `apps/web/public/taukelogo.png`.
- Reference UI art/code: 10 `screen.png` / `code.html` pairs under `docs/tauke-customer`, `docs/tauke-front-page`, and `docs/tauke-merchant`.
- Implemented app route surface: 9 Next.js `page.tsx` routes under `apps/web/app` covering landing, customer menu/checkout/order tracking, and merchant login/onboarding/catalog/fulfillment/dashboard.
- Domain/data foundation: `packages/domain`, `packages/env`, `supabase/migrations`, `supabase/types`, and local smoke/validation scripts.

## Classification

| Artifact group | Examples | Classification | Rationale |
| --- | --- | --- | --- |
| Product/design docs | `docs/DESIGN.md`, `docs/taukeplan.md` | Keep | These are source-of-truth references for product scope, tone, and visual direction. |
| Screen references | `docs/tauke-*/*/screen.png` | Keep as visual references | They are useful acceptance references, but not runtime assets. |
| Generated/reference HTML | `docs/tauke-*/*/code.html` | Defer extraction | Treat as design reference only; do not wire directly into app code without component extraction and regression checks. |
| Logo assets | `docs/taukelogo.png`, `apps/web/public/taukelogo.png` | Keep | Brand assets are already local and do not cross live integration boundaries. |
| Implemented Next routes | `apps/web/app/**/page.tsx` | Keep | They provide a coherent demo/PWA shell aligned to current foundation scope. |
| Demo data | `apps/web/lib/demo-data.ts`, `apps/web/lib/merchant-data.ts` | Wire later | Safe for local demos; production persistence should wire through Supabase/RLS contracts in a separate task. |
| Domain fake adapters | `packages/domain/src/adapters/*` | Keep | Explicit no-live-payment/no-live-booking behavior enforces current safety boundary. |
| Supabase migration/types | `supabase/migrations`, `supabase/types/database.ts` | Keep | Provides tenant/RLS schema contract; remote application remains deferred. |
| `.omx/ultragoal` | `.omx/ultragoal/goals.json`, ledger, brief | Leader-owned only | Workers may cite for G001 evidence but must not checkpoint or mutate it. |

## Review probe: risks, edge cases, and contract violations

- No `.omx/ultragoal` worker checkpoint was created during this audit.
- Generated HTML includes implementation-like code but remains under `docs/`; the safe contract is to use it as reference, not as copied runtime source.
- Demo data is in application code and should not be mistaken for persistence. Follow-on Supabase wiring should introduce explicit server/client boundary modules and tests.
- Current payment/delivery language is intentionally fake/stubbed. Any move to live Stripe/Lalamove must be a separate leader-approved production integration task with fail-closed env checks preserved.
- The Taukei directory currently lacks a `.git` directory, so worker-required commits are impossible from this runtime checkout. This is a process/state blocker, not a product artifact defect.

## Verification evidence

Commands run from `/Users/khairulanwar/dev/taukei`:

```sh
find docs -path '*/screen.png' -o -path '*/code.html' -o -name 'DESIGN.md' -o -name 'taukeplan.md' -o -name 'taukelogo.png'
find apps/web/app -name 'page.tsx'
grep -n "G001-reconciliation-boundary-contract\|\.omx/ultragoal\|leader-owned" docs/implementation/g008-reconciliation-boundary-contract.md
bun run lint
```

Observed results:

- 10 screen/code reference pairs inventoried.
- 9 app routes inventoried.
- Boundary contract references `.omx/ultragoal`, `G001-reconciliation-boundary-contract`, and leader-owned state explicitly.
- `bun run lint` passed.
- `git status` / `git commit` failed with `fatal: not a git repository (or any of the parent directories): .git`.

## Stop condition

The audit is complete when this document exists, lint passes, `.omx/ultragoal` remains unmodified by the worker, and the team task lifecycle records the no-git commit gap for leader integration.
