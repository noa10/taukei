import { expect, test, mock, describe, beforeEach } from "bun:test";
import { LiveStripeAdapter } from "../adapter";
import type { PaymentSessionRequest } from "@taukei/domain";

// Minimal mock for Stripe SDK
const mockSession = {
  id: "cs_test_12345",
  url: "https://checkout.stripe.com/test/session",
};

const mockEvent = {
  id: "evt_test_123",
  type: "checkout.session.completed",
  data: { object: { id: "cs_test_12345" } },
};

function createMockStripeClient() {
  return {
    createCheckoutSession: mock(async () => mockSession),
    verifyWebhookSignature: mock(async () => mockEvent),
    instance: {},
  };
}

describe("LiveStripeAdapter", () => {
  const baseRequest: PaymentSessionRequest = {
    merchantId: "merchant-1",
    orderRef: "TK-TEST-1",
    amountCents: 2350,
    currency: "MYR",
    platformFeeCents: 100,
    successUrl: "http://localhost:3000/order/success",
    cancelUrl: "http://localhost:3000/order/cancelled",
  };

  test("sandbox mode returns requires_payment with noLivePayment=false", async () => {
    const mockClient = createMockStripeClient();
    const adapter = new LiveStripeAdapter(
      { secretKey: "sk_test_x", webhookSecret: "whsec_test" },
      "sandbox",
    );
    // Override the internal client for testing
    (adapter as unknown as { client: typeof mockClient }).client = mockClient;

    const session = await adapter.createCheckoutSession(baseRequest);

    expect(session.status).toBe("requires_payment");
    expect(session.noLivePayment).toBe(false);
    expect(session.mode).toBe("sandbox");
    expect(session.provider).toBe("sandbox_stripe");
  });

  test("live mode returns stripe provider", async () => {
    const mockClient = createMockStripeClient();
    const adapter = new LiveStripeAdapter(
      { secretKey: "sk_live_x", webhookSecret: "whsec_live" },
      "live",
    );
    (adapter as unknown as { client: typeof mockClient }).client = mockClient;

    const session = await adapter.createCheckoutSession(baseRequest);

    expect(session.mode).toBe("live");
    expect(session.provider).toBe("stripe");
    expect(session.noLivePayment).toBe(false);
  });

  test("delegates to StripeClient.createCheckoutSession with correct params", async () => {
    const mockClient = createMockStripeClient();
    const adapter = new LiveStripeAdapter(
      { secretKey: "sk_test_x", webhookSecret: "whsec_test" },
      "sandbox",
    );
    (adapter as unknown as { client: typeof mockClient }).client = mockClient;

    await adapter.createCheckoutSession(baseRequest);

    expect(mockClient.createCheckoutSession).toHaveBeenCalledTimes(1);
    const callArgs = mockClient.createCheckoutSession.mock.calls[0]!;
    expect(callArgs[0].amountCents).toBe(2350);
    expect(callArgs[0].metadata?.merchantId).toBe("merchant-1");
    expect(callArgs[0].metadata?.orderRef).toBe("TK-TEST-1");
  });

  test("maps Stripe session response to PaymentSession", async () => {
    const mockClient = createMockStripeClient();
    const adapter = new LiveStripeAdapter(
      { secretKey: "sk_test_x", webhookSecret: "whsec_test" },
      "sandbox",
    );
    (adapter as unknown as { client: typeof mockClient }).client = mockClient;

    const session = await adapter.createCheckoutSession(baseRequest);

    expect(session.id).toBe("cs_test_12345");
    expect(session.checkoutUrl).toBe("https://checkout.stripe.com/test/session");
    expect(session.amountCents).toBe(2350);
    expect(session.currency).toBe("MYR");
  });
});
