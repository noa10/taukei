import { expect, test, mock, describe } from "bun:test";
import {
  createCheckoutDraft,
  priceCartFromCatalog,
  PricingError,
  type CheckoutRequest,
  type MenuItemSnapshot,
  type PaymentSession,
  type DeliveryQuote,
  type DeliveryJob,
  type StripePort,
  type LalamovePort,
  type Currency,
  type VehicleType,
} from "../src";
import type { IntegrationMode } from "@taukei/env";
import { createStripeAdapterFromEnv } from "../src/adapters/stripe";
import { createLalamoveAdapterFromEnv } from "../src/adapters/lalamove";

const catalog: MenuItemSnapshot[] = [
  {
    id: "beef-krapow",
    merchantId: "merchant-1",
    name: "Signature Basil Beef Pad Kra Pao",
    priceCents: 1650,
    currency: "MYR",
    isAvailable: true,
    isFragile: false,
    prepBufferMinutes: 15,
  },
  {
    id: "thai-tea",
    merchantId: "merchant-1",
    name: "Thai Milk Tea",
    priceCents: 650,
    currency: "MYR",
    isAvailable: true,
    isFragile: true,
    prepBufferMinutes: 5,
  },
  {
    id: "hidden-special",
    merchantId: "merchant-1",
    name: "Unavailable special",
    priceCents: 999,
    currency: "MYR",
    isAvailable: false,
    isFragile: false,
    prepBufferMinutes: 20,
  },
];

// Mock adapters for testing
function createMockStripeAdapter(): StripePort {
  return {
    mode: "sandbox" as IntegrationMode,
    createCheckoutSession: mock(
      async (request): Promise<PaymentSession> => ({
        id: `cs_sandbox_${request.orderRef}`,
        provider: "sandbox_stripe",
        mode: "sandbox",
        status: "requires_payment",
        amountCents: request.amountCents,
        currency: request.currency as Currency,
        checkoutUrl: `${request.successUrl}?stub_session=${request.orderRef}`,
        noLivePayment: false,
        metadata: {
          merchantId: request.merchantId,
          orderRef: request.orderRef,
          platformFeeCents: request.platformFeeCents,
        },
      }),
    ),
  };
}

function createMockLalamoveAdapter(): LalamovePort {
  return {
    mode: "sandbox" as IntegrationMode,
    quoteDelivery: mock(
      async (request): Promise<DeliveryQuote> => {
        const vehicleType: VehicleType = request.lines.some(
          (l) => l.isFragileSnapshot,
        )
          ? "CAR"
          : "MOTORCYCLE";
        return {
          id: `quote_sandbox_${request.orderRef}`,
          provider: "sandbox_lalamove",
          mode: "sandbox",
          vehicleType,
          feeCents: vehicleType === "CAR" ? 900 : 600,
          currency: "MYR",
          noLiveBooking: false,
          metadata: {
            merchantId: request.merchantId,
            storeId: request.storeId,
            orderRef: request.orderRef,
            quotationId: "qt_mock_123",
            stopIdPickup: "stop_p",
            stopIdDropoff: "stop_d",
            serviceType: vehicleType,
          },
        };
      },
    ),
    scheduleDeliveryJob: mock(
      async (quote, dispatchAt): Promise<DeliveryJob> => ({
        id: `job_${quote.id}`,
        provider: quote.provider,
        mode: quote.mode,
        status: "scheduled",
        vehicleType: quote.vehicleType,
        scheduledDispatchAt: dispatchAt.toISOString(),
        noLiveBooking: false,
        metadata: { quoteId: quote.id },
      }),
    ),
  };
}

test("prices from trusted catalog and ignores client-supplied unit prices", () => {
  const result = priceCartFromCatalog(
    [
      {
        menuItemId: "beef-krapow",
        quantity: 2,
        clientUnitPriceCents: 1,
      },
      { menuItemId: "thai-tea", quantity: 1, clientUnitPriceCents: 1 },
    ],
    catalog,
    { deliveryFeeCents: 700, platformFeeCents: 100 },
  );

  expect(result.totals.subtotalCents).toBe(3950);
  expect(result.totals.deliveryFeeCents).toBe(700);
  expect(result.totals.platformFeeCents).toBe(100);
  expect(result.totals.totalCents).toBe(4750);
  expect(
    result.lines.find((line) => line.menuItemId === "beef-krapow")
      ?.unitPriceCents,
  ).toBe(1650);
});

test("rejects unavailable and unknown catalog items", () => {
  expect(() =>
    priceCartFromCatalog(
      [{ menuItemId: "hidden-special", quantity: 1 }],
      catalog,
    ),
  ).toThrow(PricingError);
  expect(() =>
    priceCartFromCatalog([{ menuItemId: "missing", quantity: 1 }], catalog),
  ).toThrow("trusted catalog");
});

test("checkout orchestration with mock adapters", async () => {
  const request: CheckoutRequest = {
    merchantId: "merchant-1",
    storeId: "store-1",
    cart: [
      {
        menuItemId: "beef-krapow",
        quantity: 1,
        clientUnitPriceCents: 1,
      },
      { menuItemId: "thai-tea", quantity: 1, clientUnitPriceCents: 1 },
    ],
    catalog,
    customer: { name: "Aina Demo", phone: "+60123334444" },
    deliveryAddress: {
      line1: "Demo Residence",
      city: "Kuala Lumpur",
      postcode: "50000",
      latitude: 3.1,
      longitude: 101.7,
    },
  };

  const draft = await createCheckoutDraft(
    request,
    {
      stripe: createMockStripeAdapter(),
      lalamove: createMockLalamoveAdapter(),
    },
    {
      now: new Date("2026-06-10T12:00:00.000Z"),
      orderRefFactory: () => "TK-TEST-2",
      pickupAddress: {
        line1: "Store Address",
        city: "Kuala Lumpur",
        latitude: 3.139,
        longitude: 101.6869,
        storeName: "Test Store",
        storePhone: "0123456789",
      },
    },
  );

  expect(draft.orderRef).toBe("TK-TEST-2");
  expect(draft.totals.subtotalCents).toBe(2300);
  expect(draft.deliveryQuote.vehicleType).toBe("CAR");
  expect(draft.totals.deliveryFeeCents).toBe(900);
  expect(draft.totals.totalCents).toBe(3300);
  expect(draft.paymentSession.amountCents).toBe(3300);
  expect(draft.paymentSession.status).toBe("requires_payment");
  expect(draft.paymentSession.noLivePayment).toBe(false);
  expect(draft.stripeCheckoutUrl).toBeTruthy();
});

test("adapter factories create live adapters for sandbox mode", () => {
  const stripe = createStripeAdapterFromEnv({
    TAUKEI_STRIPE_MODE: "sandbox",
    STRIPE_SECRET_KEY: "sk_test_demo",
    STRIPE_WEBHOOK_SECRET: "whsec_test",
  });
  expect(stripe.mode).toBe("sandbox");

  const lalamove = createLalamoveAdapterFromEnv({
    TAUKEI_LALAMOVE_MODE: "sandbox",
    LALAMOVE_API_KEY: "test_key",
    LALAMOVE_API_SECRET: "test_secret",
  });
  expect(lalamove.mode).toBe("sandbox");
});
