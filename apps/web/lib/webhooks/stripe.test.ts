import { expect, test, describe } from "bun:test";
import {
  processStripeWebhook,
  verifyStripeSignature,
  createStripeTestSignature,
  parseStripeEvent,
} from "./stripe";

describe("Stripe webhook processing", () => {
  test("rejects without webhook secret configured", async () => {
    const result = await processStripeWebhook("{}", null, {
      TAUKEI_STRIPE_MODE: "sandbox",
      STRIPE_SECRET_KEY: "sk_test_x",
    });
    expect(result.accepted).toBe(false);
    expect(result.reason).toContain("STRIPE_WEBHOOK_SECRET");
  });

  test("rejects without stripe-signature header", async () => {
    const result = await processStripeWebhook("{}", null, {
      TAUKEI_STRIPE_MODE: "sandbox",
      STRIPE_SECRET_KEY: "sk_test_x",
      STRIPE_WEBHOOK_SECRET: "whsec_test",
    });
    expect(result.accepted).toBe(false);
    expect(result.reason).toContain("signature");
  });

  test("verifies and parses a valid Stripe event", async () => {
    const secret = "whsec_test_secret";
    const eventPayload = JSON.stringify({
      id: "evt_test_123",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          payment_status: "paid",
          metadata: {
            orderRef: "TK-TEST-1",
            merchantId: "merchant-1",
          },
        },
      },
    });

    const signature = createStripeTestSignature(eventPayload, secret);

    const result = await processStripeWebhook(eventPayload, signature, {
      TAUKEI_STRIPE_MODE: "sandbox",
      STRIPE_SECRET_KEY: "sk_test_x",
      STRIPE_WEBHOOK_SECRET: secret,
    });

    expect(result.accepted).toBe(true);
    expect(result.status).toBe("processed");
    expect(result.orderId).toBe("TK-TEST-1");
    expect(result.merchantId).toBe("merchant-1");
    expect(result.orderStatus).toBe("confirmed");
    expect(result.fulfillmentStatus).toBe("preparing");
  });

  test("rejects invalid signature", async () => {
    const eventPayload = JSON.stringify({
      id: "evt_test_bad",
      type: "checkout.session.completed",
      data: { object: { id: "cs_bad" } },
    });

    const result = await processStripeWebhook(eventPayload, "t=0,v1=bad", {
      TAUKEI_STRIPE_MODE: "sandbox",
      STRIPE_SECRET_KEY: "sk_test_x",
      STRIPE_WEBHOOK_SECRET: "whsec_test",
    });

    expect(result.accepted).toBe(false);
    expect(result.status).toBe("rejected");
  });

  test("handles async payment failure", async () => {
    const secret = "whsec_test_fail";
    const eventPayload = JSON.stringify({
      id: "evt_fail_1",
      type: "checkout.session.async_payment_failed",
      data: {
        object: {
          id: "cs_fail_1",
          metadata: { orderRef: "TK-FAIL-1", merchantId: "merchant-1" },
        },
      },
    });

    const signature = createStripeTestSignature(eventPayload, secret);
    const result = await processStripeWebhook(eventPayload, signature, {
      TAUKEI_STRIPE_MODE: "sandbox",
      STRIPE_SECRET_KEY: "sk_test_x",
      STRIPE_WEBHOOK_SECRET: secret,
    });

    expect(result.accepted).toBe(true);
    expect(result.orderStatus).toBe("cancelled");
  });
});

describe("verifyStripeSignature", () => {
  test("validates correctly signed payloads", () => {
    const secret = "whsec_test";
    const payload = '{"test":true}';
    const signature = createStripeTestSignature(payload, secret);
    expect(verifyStripeSignature(payload, signature, secret)).toBe(true);
  });

  test("rejects tampered payloads", () => {
    const secret = "whsec_test";
    const payload = '{"test":true}';
    const signature = createStripeTestSignature(payload, secret);
    expect(verifyStripeSignature('{"test":false}', signature, secret)).toBe(false);
  });
});

describe("parseStripeEvent", () => {
  test("parses valid checkout.session.completed", () => {
    const event = parseStripeEvent(
      JSON.stringify({
        id: "evt_1",
        type: "checkout.session.completed",
        data: { object: { id: "cs_1", payment_status: "paid" } },
      }),
    );
    expect(event?.id).toBe("evt_1");
    expect(event?.type).toBe("checkout.session.completed");
  });

  test("returns null for unsupported event types", () => {
    const event = parseStripeEvent(
      JSON.stringify({
        id: "evt_2",
        type: "invoice.paid",
        data: { object: { id: "in_1" } },
      }),
    );
    expect(event).toBeNull();
  });
});
