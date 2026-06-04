import { loadTaukeiEnv, type RawEnv } from "@taukei/env";
import type { IntegrationMode } from "@taukei/env";
import type { PaymentSession, PaymentSessionRequest, StripePort } from "../types";

function makeSessionId(mode: IntegrationMode, orderRef: string): string {
  const safeRef = orderRef.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return `cs_${mode}_taukei_${safeRef}`;
}

export class FakeStripeAdapter implements StripePort {
  readonly mode: IntegrationMode;

  constructor(mode: Extract<IntegrationMode, "fake" | "sandbox"> = "fake") {
    this.mode = mode;
  }

  async createCheckoutSession(request: PaymentSessionRequest): Promise<PaymentSession> {
    return {
      id: makeSessionId(this.mode, request.orderRef),
      provider: this.mode === "sandbox" ? "sandbox_stripe" : "fake_stripe",
      mode: this.mode,
      status: "stubbed",
      amountCents: request.amountCents,
      currency: request.currency,
      checkoutUrl: `${request.successUrl}?stub_session=${encodeURIComponent(makeSessionId(this.mode, request.orderRef))}`,
      noLivePayment: true,
      metadata: {
        merchantId: request.merchantId,
        orderRef: request.orderRef,
        platformFeeCents: request.platformFeeCents,
        noNetwork: true
      }
    };
  }
}

export function createStripeAdapterFromEnv(raw?: RawEnv): StripePort {
  const env = loadTaukeiEnv(raw);
  if (env.stripeMode === "live") {
    throw new Error("Live Stripe adapter is intentionally not implemented in the Taukei foundation. Use fake/sandbox until the explicit production integration phase.");
  }
  return new FakeStripeAdapter(env.stripeMode);
}
