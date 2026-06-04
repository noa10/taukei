import { afterEach, describe, expect, it } from "bun:test";
import { createStripeTestSignature, resetStripeWebhookIdempotencyForTests } from "../../../../lib/webhooks/stripe";
import { POST } from "./route";

const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
const originalMode = process.env.TAUKEI_STRIPE_MODE;

function stripeEventPayload(id = "evt_route_checkout_completed") {
  return JSON.stringify({
    id,
    type: "checkout.session.completed",
    livemode: false,
    data: {
      object: {
        id: "cs_fake_taukei_tk_demo_1001",
        payment_intent: "pi_route_1001",
        payment_status: "paid",
        amount_total: 3300,
        currency: "myr",
        metadata: { orderRef: "TK-DEMO-1001" }
      }
    }
  });
}

afterEach(() => {
  resetStripeWebhookIdempotencyForTests();
  if (originalSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
  else process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
  if (originalMode === undefined) delete process.env.TAUKEI_STRIPE_MODE;
  else process.env.TAUKEI_STRIPE_MODE = originalMode;
});

describe("POST /api/webhooks/stripe", () => {
  it("processes a signed deterministic Stripe event and returns reconciliation evidence", async () => {
    process.env.TAUKEI_STRIPE_MODE = "sandbox";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_route_taukei";
    const payload = stripeEventPayload();
    const response = await POST(new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": createStripeTestSignature(payload, "whsec_route_taukei") },
      body: payload
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("processed");
    expect(body.serviceRoleBoundary).toBe("service-role-supabase-boundary");
    expect(body.reconciliation).toEqual(expect.objectContaining({ next_status: "paid", no_live_payment: true }));
    expect(body.noLiveSideEffect).toBe(true);
  });

  it("returns duplicate for repeated event ids without repeating reconciliation work", async () => {
    const payload = stripeEventPayload("evt_route_duplicate");
    const requestInit = { method: "POST", headers: { "stripe-signature": "deterministic-test-signature" }, body: payload };
    const first = await POST(new Request("http://localhost/api/webhooks/stripe", requestInit));
    const second = await POST(new Request("http://localhost/api/webhooks/stripe", requestInit));
    const secondBody = await second.json();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(secondBody.status).toBe("duplicate");
    expect(secondBody.webhookEvent.duplicate).toBe(true);
  });

  it("rejects missing signatures even when a webhook secret is not configured", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const response = await POST(new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: stripeEventPayload("evt_missing_signature")
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe("rejected");
    expect(body.reason).toContain("Missing stripe-signature");
  });
});
