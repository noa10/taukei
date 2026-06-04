# G004 Taukei Design System and Customer Flow

## Scope

This story implements the customer-facing Taukei web/PWA slice: design tokens/primitives, a seeded storefront, cart preview, delivery-details checkout, stubbed order creation, confirmation, and tracking skeleton. It remains local/static/stubbed and does not move money or book riders.

## Artifacts

- `apps/web/components/primitives.tsx` — Taukei UI primitives (`Badge`, `ButtonLink`, `Card`, `SectionHeader`).
- `apps/web/lib/demo-data.ts` — seeded customer demo merchant/catalog/cart/checkout data.
- `apps/web/app/page.tsx` — home page links into the customer demo flow.
- `apps/web/app/mad-krapow-demo/page.tsx` — customer storefront/menu/cart preview.
- `apps/web/app/mad-krapow-demo/checkout/page.tsx` — stub checkout/order creation using `@taukei/domain` fake adapters.
- `apps/web/app/order/TK-DEMO-1001/page.tsx` — confirmation/tracking skeleton.
- `apps/web/app/globals.css` — Taukei design tokens and component styles.
- `scripts/smoke-customer-flow.sh` — local route smoke coverage for storefront, checkout, and tracking.

## Customer flow coverage

1. `/mad-krapow-demo` renders the seeded merchant storefront, menu cards, cart preview, trusted catalog subtotal, and no-live-side-effect notice.
2. `/mad-krapow-demo/checkout` runs the domain checkout draft with fake Stripe and fake Lalamove adapters, displays delivery details, order totals, fake quote/session identifiers, and no-live payment/booking copy.
3. `/order/TK-DEMO-1001` renders an order confirmation/tracking skeleton with fake provider status and explicit no-live-side-effect verification.

## Design system notes

The UI uses Taukei's high-energy mobile-commerce direction from `docs/DESIGN.md`: Electric Salmon primary actions, Cyber Mint success/safety badges, thick outlines, rounded cards, crisp offset shadows, and mobile-first responsive layout.

## Safety notes

- The checkout page imports `FakeStripeAdapter` and `FakeLalamoveAdapter` directly.
- The smoke test checks for `fake_stripe`, `fake_lalamove`, and “does not move money or book riders”.
- Live Stripe payment movement and live Lalamove rider booking remain deferred.

## Verification

Relevant commands:

```sh
bun run lint
bun run typecheck
bun run test
bun run build
bun run smoke
bun run smoke:customer
```
