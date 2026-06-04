# G003 Domain Services and Safe Integration Ports

## Scope

This story adds validated domain services and fake/sandbox integration ports for Taukei checkout. It intentionally does not call Stripe or Lalamove networks, move money, or book riders. Live adapters remain deferred until a later explicit production integration phase.

## Artifacts

- `packages/domain/src/types.ts` — checkout, pricing, payment, and delivery port types.
- `packages/domain/src/services/pricing.ts` — server-side catalog pricing and order totals.
- `packages/domain/src/services/checkout.ts` — checkout draft orchestration across pricing, payment, and delivery ports.
- `packages/domain/src/adapters/stripe.ts` — fake/sandbox Stripe adapter and fail-closed live factory.
- `packages/domain/src/adapters/lalamove.ts` — fake/sandbox Lalamove adapter, vehicle selection, and fail-closed live factory.
- `packages/domain/tests/domain.test.ts` — unit coverage for pricing, adapters, checkout orchestration, and live-mode guards.

## Design decisions

- Cart input may contain client-supplied unit prices, but pricing ignores them and uses trusted catalog snapshots.
- The platform fee defaults to RM 1.00 (`100` cents), matching the Taukei planning notes.
- Delivery quote fees are deterministic fake values: motorcycle RM 6.00, car RM 9.00.
- Fragile item snapshots force `CAR`; otherwise delivery defaults to `MOTORCYCLE`.
- Checkout orchestration calculates the fake dispatch time as `now + max(prep buffer - 6 minutes, 0)`, reflecting the plan's delayed dispatch model without scheduling a real job.
- `createStripeAdapterFromEnv` and `createLalamoveAdapterFromEnv` reject `live` even when credentials exist, because G003 is still a no-live-side-effect foundation.

## Verification

The G003 tests prove:

- Server-side totals come from trusted catalog prices, not client-provided prices.
- Unavailable and unknown menu items are rejected.
- Fragile items select car delivery.
- Fake adapters return stub metadata and `noLivePayment` / `noLiveBooking` flags.
- Checkout orchestration combines pricing, fake delivery quote/job, and fake payment session.
- Live adapter factories fail closed for Stripe and Lalamove.
- Sandbox adapter factories still use no-network stubs.
