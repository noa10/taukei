# G001 Boundary and Idempotency Contract

This document supports `.omx/ultragoal` G001-reconciliation-boundary-contract. It records the unauthenticated checkout assumption and the minimum idempotency table shape required before Taukei processes real Stripe or Lalamove webhook side effects.

## Unauthenticated checkout assumption

Taukei permits public customer checkout from a merchant storefront without a customer login in the foundation phase.

Required guardrails:

- The request must be scoped to a public merchant/store pair. The current demo boundary accepts only `demoMerchant.id` and `demoMerchant.storeId` in `apps/web/app/mad-krapow-demo/checkout/actions.ts`.
- Cart pricing must be recomputed from trusted catalog snapshots through `@taukei/domain`; client-supplied unit prices are ignored.
- Customer contact details are collected only for order/delivery coordination. Merchant operations still require authenticated merchant scope before real mutations are wired.
- The checkout boundary may create a fake-provider draft, but production order persistence remains deferred until Supabase write paths and idempotency guards are implemented.
- Live payment capture and live rider booking remain blocked by env/domain guardrails in this G001 scope.

## Mutation boundary ownership

| Boundary | Current file | G001 behavior | Later production requirement |
| --- | --- | --- | --- |
| Public checkout action | `apps/web/app/mad-krapow-demo/checkout/actions.ts` | Validates public merchant/store/cart/customer shape, delegates to domain checkout with fake/sandbox adapters, returns a stub draft. | Persist order/customer/payment/delivery rows in one transaction with an idempotency key. |
| Merchant catalog action | `apps/web/app/merchant/actions.ts` | Requires explicit `merchantId`, rejects cross-tenant input, returns a stubbed action result. | Require Supabase Auth session, verify membership/RLS, then mutate catalog rows. |
| Merchant fulfillment action | `apps/web/app/merchant/actions.ts` | Requires explicit `merchantId`, rejects cross-tenant input, returns a stubbed action result. | Require Supabase Auth session, verify membership/RLS, then append order/fulfillment events. |
| Stripe webhook route | `apps/web/app/api/webhooks/stripe/route.ts` | Requires a signature header and returns a stub idempotency result. | Verify signature, record event idempotently, reconcile payment rows, and handle replay safely. |
| Lalamove webhook route | `apps/web/app/api/webhooks/lalamove/route.ts` | Requires a signature header and returns a stub idempotency result. | Verify signature, record event idempotently, reconcile delivery rows, and handle replay safely. |

## Idempotency table shape

Before real checkout persistence or provider webhook processing, add a durable table equivalent to:

```sql
create table public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references public.merchants(id),
  scope text not null,
  idempotency_key text not null,
  request_hash text,
  provider text,
  provider_event_id text,
  status text not null check (status in ('started', 'completed', 'failed', 'replayed')),
  response jsonb not null default '{}'::jsonb,
  error jsonb not null default '{}'::jsonb,
  locked_until timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scope, idempotency_key)
);
```

Recommended scopes:

- `checkout:create-order:{merchant_id}` for public checkout order creation.
- `merchant:catalog:{merchant_id}` for catalog mutations if client retries are allowed.
- `merchant:fulfillment:{merchant_id}` for order status transitions.
- `webhook:stripe` for Stripe provider events.
- `webhook:lalamove` for Lalamove provider events.

Minimum webhook key format is implemented in `apps/web/lib/webhooks/idempotency.ts` as:

```text
{provider}:{provider_event_id}
```

## Replay rules

- Same `scope` + same `idempotency_key` + same `request_hash`: return the stored response without repeating provider or database side effects.
- Same `scope` + same `idempotency_key` + different `request_hash`: reject as a key collision.
- `started` with an expired `locked_until`: allow a single recovery worker to retry.
- `completed`: never repeat payment capture, rider booking, or fulfillment event append.
- `failed`: return the stored failure unless an operator or recovery policy explicitly marks it retryable.

## RLS and tenant notes

- Checkout idempotency rows should include `merchant_id` when known, but unauthenticated customers must not receive broad read access to the table.
- Merchant action rows must be restricted to `public.is_merchant_member(merchant_id)` once real Supabase writes are enabled.
- Provider webhook rows are service-role owned; they should not be readable by browser clients.
- Webhook handlers must verify provider signatures before trusting `provider_event_id`.

## Deferred items

- Adding the actual `public.idempotency_keys` migration is deferred because G001 currently wires fail-closed app boundaries, not production persistence.
- Stripe Connect account reconciliation, Lalamove live booking reconciliation, observability, and replay tooling require separate production integration stories.
