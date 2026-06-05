import { afterEach, describe, expect, it } from "bun:test";
import {
  createStripeTestSignature,
  processDeterministicStripeWebhook,
  resetStripeWebhookIdempotencyForTests,
} from "./stripe";

const event = {
  id: "evt_test_checkout_completed",
  type: "checkout.session.completed",
  livemode: false,
  data: {
    object: {
      id: "cs_fake_taukei_tk_test_001",
      payment_intent: "pi_test_1001",
      payment_status: "paid",
      amount_total: 3300,
      currency: "myr",
      metadata: { orderRef: "TK-TEST-001" },
    },
  },
} as const;

const payload = JSON.stringify(event);

afterEach(() => {
  resetStripeWebhookIdempotencyForTests();
});

describe("deterministic Stripe webhook processing", () => {
  it("verifies configured signatures and reconciles the test payment session without live side effects", async () => {
    const signature = createStripeTestSignature(payload, "whsec_test_taukei");
    const result = await processDeterministicStripeWebhook(payload, signature, {
      TAUKEI_STRIPE_MODE: "sandbox",
      STRIPE_WEBHOOK_SECRET: "whsec_test_taukei",
    });

    expect(result.accepted).toBe(true);
    expect(result.status).toBe("processed");
    expect(result.mode).toBe("sandbox");
    expect(result.webhookEvent).toEqual(
      expect.objectContaining({
        event_id: event.id,
        duplicate: false,
        no_live_side_effect: true,
      }),
    );
    expect(result.reconciliation).toEqual(
      expect.objectContaining({
        order_ref: "TK-TEST-001",
        provider_session_id: "cs_fake_taukei_tk_test_001",
        provider_payment_intent_id: "pi_test_1001",
        previous_status: "stubbed",
        next_status: "paid",
        amount_cents: 3300,
        currency: "MYR",
        no_live_payment: true,
      }),
    );
    expect(result.noLiveSideEffect).toBe(true);
    expect(result.productionGuardrail).toEqual(
      expect.objectContaining({
        idempotencyScope: "process-local-foundation-only",
        remotePersistence: false,
        productionReady: false,
        requiresAtomicWebhookEvents: true,
      }),
    );
  });

  it("rejects bad configured signatures before event processing", async () => {
    const result = await processDeterministicStripeWebhook(
      payload,
      "t=1780000000,v1=bad",
      {
        TAUKEI_STRIPE_MODE: "sandbox",
        STRIPE_WEBHOOK_SECRET: "whsec_test_taukei",
      },
    );

    expect(result.accepted).toBe(false);
    expect(result.status).toBe("rejected");
    expect(result.reason).toContain("signature");
  });

  it("handles duplicate Stripe events idempotently", async () => {
    const first = await processDeterministicStripeWebhook(
      payload,
      "deterministic-test-signature",
      { TAUKEI_STRIPE_MODE: "fake" },
    );
    const duplicate = await processDeterministicStripeWebhook(
      payload,
      "deterministic-test-signature",
      { TAUKEI_STRIPE_MODE: "fake" },
    );

    expect(first.status).toBe("processed");
    expect(duplicate.status).toBe("duplicate");
    expect(duplicate.idempotencyKey).toBe(first.idempotencyKey);
    expect(duplicate.webhookEvent?.duplicate).toBe(true);
    expect(duplicate.reconciliation).toEqual(first.reconciliation);
  });

  it("fails closed for live Stripe event payloads", async () => {
    const livePayload = JSON.stringify({
      ...event,
      id: "evt_live_rejected",
      livemode: true,
    });
    const result = await processDeterministicStripeWebhook(
      livePayload,
      "deterministic-test-signature",
      { TAUKEI_STRIPE_MODE: "fake" },
    );

    expect(result.accepted).toBe(false);
    expect(result.status).toBe("rejected");
    expect(result.noLiveSideEffect).toBe(true);
    expect(result.reason).toContain("Live Stripe event payload rejected");
  });
});
