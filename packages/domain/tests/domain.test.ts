import { expect, test } from "bun:test";
import {
  createCheckoutDraft,
  createLalamoveAdapterFromEnv,
  createStripeAdapterFromEnv,
  FakeLalamoveAdapter,
  FakeStripeAdapter,
  priceCartFromCatalog,
  PricingError,
  selectVehicleType,
  type CheckoutRequest,
  type MenuItemSnapshot
} from "../src";

const catalog: MenuItemSnapshot[] = [
  {
    id: "beef-krapow",
    merchantId: "merchant-1",
    name: "Signature Basil Beef Pad Kra Pao",
    priceCents: 1650,
    currency: "MYR",
    isAvailable: true,
    isFragile: false,
    prepBufferMinutes: 15
  },
  {
    id: "thai-tea",
    merchantId: "merchant-1",
    name: "Thai Milk Tea",
    priceCents: 650,
    currency: "MYR",
    isAvailable: true,
    isFragile: true,
    prepBufferMinutes: 5
  },
  {
    id: "hidden-special",
    merchantId: "merchant-1",
    name: "Unavailable special",
    priceCents: 999,
    currency: "MYR",
    isAvailable: false,
    isFragile: false,
    prepBufferMinutes: 20
  }
];

test("prices from trusted catalog and ignores client-supplied unit prices", () => {
  const result = priceCartFromCatalog(
    [
      { menuItemId: "beef-krapow", quantity: 2, clientUnitPriceCents: 1 },
      { menuItemId: "thai-tea", quantity: 1, clientUnitPriceCents: 1 }
    ],
    catalog,
    { deliveryFeeCents: 700, platformFeeCents: 100 }
  );

  expect(result.totals.subtotalCents).toBe(3950);
  expect(result.totals.deliveryFeeCents).toBe(700);
  expect(result.totals.platformFeeCents).toBe(100);
  expect(result.totals.totalCents).toBe(4750);
  expect(result.lines.find((line) => line.menuItemId === "beef-krapow")?.unitPriceCents).toBe(1650);
});

test("rejects unavailable and unknown catalog items", () => {
  expect(() => priceCartFromCatalog([{ menuItemId: "hidden-special", quantity: 1 }], catalog)).toThrow(PricingError);
  expect(() => priceCartFromCatalog([{ menuItemId: "missing", quantity: 1 }], catalog)).toThrow("trusted catalog");
});


test("rejects unsafe monetary and quantity inputs", () => {
  expect(() => priceCartFromCatalog([{ menuItemId: "beef-krapow", quantity: 1 }], catalog, { platformFeeCents: -1 })).toThrow("Platform fee");
  expect(() => priceCartFromCatalog([{ menuItemId: "beef-krapow", quantity: 1 }], catalog, { deliveryFeeCents: -1 })).toThrow("Delivery fee");
  expect(() => priceCartFromCatalog([{ menuItemId: "beef-krapow", quantity: 100 }], catalog)).toThrow("Invalid quantity");
  expect(() => priceCartFromCatalog([{ menuItemId: "beef-krapow", quantity: 1.5 }], catalog)).toThrow("Invalid quantity");
  expect(() => priceCartFromCatalog([
    { menuItemId: "beef-krapow", quantity: 99 },
    { menuItemId: "beef-krapow", quantity: 1 }
  ], catalog)).toThrow("Invalid quantity");
});

test("selects car when any priced line is fragile", () => {
  const fragile = priceCartFromCatalog([{ menuItemId: "thai-tea", quantity: 1 }], catalog);
  const standard = priceCartFromCatalog([{ menuItemId: "beef-krapow", quantity: 1 }], catalog);

  expect(selectVehicleType(fragile.lines)).toBe("CAR");
  expect(selectVehicleType(standard.lines)).toBe("MOTORCYCLE");
});

test("fake adapters return stub metadata without live side effects", async () => {
  const stripe = new FakeStripeAdapter();
  const lalamove = new FakeLalamoveAdapter();
  const priced = priceCartFromCatalog([{ menuItemId: "beef-krapow", quantity: 1 }], catalog);

  const quote = await lalamove.quoteDelivery({
    merchantId: "merchant-1",
    storeId: "store-1",
    orderRef: "TK-TEST-1",
    pickup: { line1: "Kitchen", city: "Kuala Lumpur" },
    dropoff: { line1: "Customer", city: "Kuala Lumpur" },
    lines: priced.lines
  });
  const job = await lalamove.scheduleDeliveryJob(quote, new Date("2026-06-04T12:14:00.000Z"));
  const session = await stripe.createCheckoutSession({
    merchantId: "merchant-1",
    orderRef: "TK-TEST-1",
    amountCents: 2350,
    currency: "MYR",
    platformFeeCents: 100,
    successUrl: "http://localhost:3000/order/success",
    cancelUrl: "http://localhost:3000/order/cancelled"
  });

  expect(quote.provider).toBe("fake_lalamove");
  expect(quote.noLiveBooking).toBe(true);
  expect(job.status).toBe("scheduled");
  expect(job.noLiveBooking).toBe(true);
  expect(session.provider).toBe("fake_stripe");
  expect(session.noLivePayment).toBe(true);
  expect(session.status).toBe("stubbed");
});

test("checkout orchestration combines server pricing, fake payment, and fake delivery", async () => {
  const request: CheckoutRequest = {
    merchantId: "merchant-1",
    storeId: "store-1",
    cart: [
      { menuItemId: "beef-krapow", quantity: 1, clientUnitPriceCents: 1 },
      { menuItemId: "thai-tea", quantity: 1, clientUnitPriceCents: 1 }
    ],
    catalog,
    customer: { name: "Aina Demo", phone: "+60123334444" },
    deliveryAddress: { line1: "Demo Residence", city: "Kuala Lumpur", postcode: "50000" }
  };

  const draft = await createCheckoutDraft(
    request,
    { stripe: new FakeStripeAdapter(), lalamove: new FakeLalamoveAdapter() },
    { now: new Date("2026-06-04T12:00:00.000Z"), orderRefFactory: () => "TK-TEST-2" }
  );

  expect(draft.orderRef).toBe("TK-TEST-2");
  expect(draft.totals.subtotalCents).toBe(2300);
  expect(draft.deliveryQuote.vehicleType).toBe("CAR");
  expect(draft.totals.deliveryFeeCents).toBe(900);
  expect(draft.totals.totalCents).toBe(3300);
  expect(draft.paymentSession.amountCents).toBe(3300);
  expect(draft.deliveryJob.scheduledDispatchAt).toBe("2026-06-04T12:09:00.000Z");
});

test("adapter factories fail closed for live modes", () => {
  expect(() => createStripeAdapterFromEnv({ TAUKEI_STRIPE_MODE: "live", TAUKEI_ALLOW_LIVE_INTEGRATIONS: "true", STRIPE_SECRET_KEY: "sk_live_demo" })).toThrow("Live Stripe adapter is intentionally not implemented");
  expect(() => createLalamoveAdapterFromEnv({ TAUKEI_LALAMOVE_MODE: "live", TAUKEI_ALLOW_LIVE_INTEGRATIONS: "true", LALAMOVE_API_KEY: "key", LALAMOVE_API_SECRET: "secret" })).toThrow("Live Lalamove adapter is intentionally not implemented");
  expect(() => priceCartFromCatalog([{ menuItemId: "beef-krapow", quantity: 1 }], catalog, { platformFeeCents: Number.MAX_SAFE_INTEGER })).toThrow("Platform fee");
});

test("adapter factories choose sandbox stubs without network side effects", async () => {
  const stripe = createStripeAdapterFromEnv({ TAUKEI_STRIPE_MODE: "sandbox" });
  const lalamove = createLalamoveAdapterFromEnv({ TAUKEI_LALAMOVE_MODE: "sandbox" });

  const session = await stripe.createCheckoutSession({
    merchantId: "merchant-1",
    orderRef: "TK-SANDBOX",
    amountCents: 1000,
    currency: "MYR",
    platformFeeCents: 100,
    successUrl: "http://localhost/success",
    cancelUrl: "http://localhost/cancel"
  });

  const quote = await lalamove.quoteDelivery({
    merchantId: "merchant-1",
    storeId: "store-1",
    orderRef: "TK-SANDBOX",
    pickup: { line1: "Kitchen", city: "Kuala Lumpur" },
    dropoff: { line1: "Customer", city: "Kuala Lumpur" },
    lines: priceCartFromCatalog([{ menuItemId: "beef-krapow", quantity: 1 }], catalog).lines
  });

  expect(session.mode).toBe("sandbox");
  expect(session.noLivePayment).toBe(true);
  expect(quote.mode).toBe("sandbox");
  expect(quote.noLiveBooking).toBe(true);
});
