import { describe, expect, it } from "bun:test";
import type { CheckoutRequest } from "@taukei/domain";
import {
  createCustomerCheckoutRecords,
  getCustomerTrackingRecords,
  validateTrustedCustomerCheckout,
} from "./customer-orders";

const testMerchantId = crypto.randomUUID();
const testStoreId = crypto.randomUUID();

const testCheckoutRequest: CheckoutRequest = {
  merchantId: testMerchantId,
  storeId: testStoreId,
  cart: [
    { menuItemId: "beef-krapow", quantity: 1 },
    { menuItemId: "thai-tea", quantity: 1 },
  ],
  customer: { name: "Test Customer", phone: "+60123456789" },
  deliveryAddress: { line1: "123 Test Street", city: "Kuala Lumpur" },
  catalog: [
    {
      id: "beef-krapow",
      merchantId: testMerchantId,
      name: "Signature Basil Beef Pad Kra Pao",
      priceCents: 1650,
      currency: "MYR",
      isAvailable: true,
      isFragile: true,
      prepBufferMinutes: 1,
    },
    {
      id: "thai-tea",
      merchantId: testMerchantId,
      name: "Thai Milk Tea",
      priceCents: 650,
      currency: "MYR",
      isAvailable: true,
      isFragile: false,
      prepBufferMinutes: 1,
    },
  ],
};

describe("G005 customer checkout records", () => {
  it("validates cart items against the request catalog", () => {
    expect(validateTrustedCustomerCheckout(testCheckoutRequest)).toBeNull();
    expect(
      validateTrustedCustomerCheckout({ ...testCheckoutRequest, catalog: [] }),
    ).toMatch(/unavailable/);
    expect(
      validateTrustedCustomerCheckout({
        ...testCheckoutRequest,
        cart: [{ menuItemId: "missing", quantity: 1, clientUnitPriceCents: 1 }],
      }),
    ).toMatch(/unavailable/);
  });

  it("prices order lines from the request catalog", async () => {
    const result = await createCustomerCheckoutRecords(testCheckoutRequest);

    expect(result.status).toBe("stubbed");
    expect(
      result.draft?.lines.map((line) => [
        line.nameSnapshot,
        line.unitPriceCents,
      ]),
    ).toEqual([
      ["Signature Basil Beef Pad Kra Pao", 1650],
      ["Thai Milk Tea", 650],
    ]);
    expect(result.records?.order.total_cents).toBe(3300);
  });

  it("creates Supabase-shaped order, item, payment, and delivery records", async () => {
    const result = await createCustomerCheckoutRecords(testCheckoutRequest);
    expect(result.status).toBe("stubbed");
    expect(result.records?.source).toBe("supabase-shaped-records-boundary");
    expect(result.records?.remotePersistence).toBe(false);
    expect(result.records?.productionGuardrail).toContain(
      "Supabase-shaped local evidence",
    );
    expect(result.records?.order.public_ref).toBe(result.draft?.orderRef);
    expect(result.records?.order.total_cents).toBe(
      result.draft?.totals.totalCents,
    );
    expect(result.records?.order.total_cents).toBe(3300);
    expect(result.records?.orderItems).toHaveLength(2);
    expect(result.records?.paymentSession.metadata.noLivePayment).toBe(true);
    expect(result.records?.deliveryJob.metadata.noLiveBooking).toBe(true);
  });

  it("exposes tracking events from checkout/payment/delivery/fulfillment records", async () => {
    const result = await createCustomerCheckoutRecords(testCheckoutRequest);
    const records = result.records;
    expect(records?.trackingEvents.map((event) => event.source)).toEqual([
      "checkout",
      "payment",
      "delivery",
      "fulfillment",
    ]);
    expect(records?.trackingEvents.map((event) => event.status)).toEqual([
      "confirmed",
      "stubbed",
      "scheduled",
      "preparing",
    ]);
    expect(records?.trackingEvents).toEqual([
      expect.objectContaining({
        label: "Order confirmed",
        payload: expect.objectContaining({
          publicRef: records?.order.public_ref,
        }),
      }),
      expect.objectContaining({
        label: "Payment stubbed",
        payload: expect.objectContaining({
          noLivePayment: true,
          provider: "fake_stripe",
        }),
      }),
      expect.objectContaining({
        label: "Delivery scheduled",
        payload: expect.objectContaining({
          noLiveBooking: true,
          provider: "fake_lalamove",
        }),
      }),
      expect.objectContaining({
        label: "Kitchen preparing",
        payload: expect.objectContaining({
          merchantId: records?.order.merchant_id,
        }),
      }),
    ]);
    expect(await getCustomerTrackingRecords("TK-MISSING")).toBeNull();
  });
});
