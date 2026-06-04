import { describe, expect, it } from "bun:test";
import { demoCheckoutRequest } from "./demo-data";
import {
  createCustomerCheckoutRecords,
  getCustomerTrackingRecords,
  validateTrustedCustomerCheckout,
} from "./customer-orders";

describe("G005 customer checkout records", () => {
  it("validates against the trusted server catalog while ignoring client catalog and unit prices", () => {
    expect(validateTrustedCustomerCheckout(demoCheckoutRequest)).toBeNull();
    expect(
      validateTrustedCustomerCheckout({ ...demoCheckoutRequest, catalog: [] }),
    ).toBeNull();
    expect(
      validateTrustedCustomerCheckout({
        ...demoCheckoutRequest,
        cart: [{ menuItemId: "missing", quantity: 1, clientUnitPriceCents: 1 }],
      }),
    ).toMatch(/unavailable/);
  });

  it("creates order records from trusted catalog snapshots even when request catalog is tampered", async () => {
    const result = await createCustomerCheckoutRecords({
      ...demoCheckoutRequest,
      catalog: [
        {
          id: "beef-krapow",
          merchantId: demoCheckoutRequest.merchantId,
          name: "Tampered free beef",
          priceCents: 1,
          currency: "MYR",
          isAvailable: true,
          isFragile: true,
          prepBufferMinutes: 1,
        },
        {
          id: "thai-tea",
          merchantId: demoCheckoutRequest.merchantId,
          name: "Tampered tea",
          priceCents: 1,
          currency: "MYR",
          isAvailable: true,
          isFragile: false,
          prepBufferMinutes: 1,
        },
      ],
    });

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
    const result = await createCustomerCheckoutRecords();
    expect(result.status).toBe("stubbed");
    expect(result.records?.source).toBe("stubbed-demo");
    expect(result.records?.remotePersistence).toBe(false);
    expect(result.records?.productionGuardrail).toContain(
      "Supabase-shaped local evidence",
    );
    expect(result.records?.order.public_ref).toBe("TK-DEMO-1001");
    expect(result.records?.order.total_cents).toBe(
      result.draft?.totals.totalCents,
    );
    expect(result.records?.order.total_cents).toBe(3300);
    expect(result.records?.orderItems).toHaveLength(2);
    expect(result.records?.paymentSession.metadata.noLivePayment).toBe(true);
    expect(result.records?.deliveryJob.metadata.noLiveBooking).toBe(true);
  });

  it("exposes tracking events from checkout/payment/delivery/fulfillment records", async () => {
    const records = await getCustomerTrackingRecords("TK-DEMO-1001");
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
        payload: expect.objectContaining({ publicRef: "TK-DEMO-1001" }),
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
