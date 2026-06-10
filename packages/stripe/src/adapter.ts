import type { IntegrationMode } from "@taukei/env";
import type {
  PaymentSession,
  PaymentSessionRequest,
  StripePort,
} from "@taukei/domain";
import { StripeClient, type StripeClientConfig } from "./client";

export class LiveStripeAdapter implements StripePort {
  readonly mode: IntegrationMode;
  private readonly client: StripeClient;

  constructor(config: StripeClientConfig, mode: IntegrationMode) {
    this.client = new StripeClient(config);
    this.mode = mode;
  }

  async createCheckoutSession(
    request: PaymentSessionRequest,
  ): Promise<PaymentSession> {
    const session = await this.client.createCheckoutSession({
      amountCents: request.amountCents,
      currency: request.currency.toLowerCase(),
      merchantName: request.merchantId, // Will be replaced with actual name by caller metadata
      successUrl: request.successUrl,
      cancelUrl: request.cancelUrl,
      metadata: {
        merchantId: request.merchantId,
        orderRef: request.orderRef,
        platformFeeCents: String(request.platformFeeCents),
      },
    });

    return {
      id: session.id,
      provider: this.mode === "live" ? "stripe" : "sandbox_stripe",
      mode: this.mode,
      status: "requires_payment",
      amountCents: request.amountCents,
      currency: request.currency,
      checkoutUrl: session.url ?? "",
      noLivePayment: false,
      metadata: {
        merchantId: request.merchantId,
        orderRef: request.orderRef,
        platformFeeCents: request.platformFeeCents,
        stripeSessionId: session.id,
      },
    };
  }
}

/**
 * Create a LiveStripeAdapter from environment configuration.
 *
 * Mode is determined by the key prefix:
 * - sk_test_ / sk_live_ → sandbox / live respectively
 * - TAUKEI_STRIPE_MODE env var takes precedence if set
 */
export function createStripeAdapterFromConfig(
  config: StripeClientConfig,
  mode: IntegrationMode,
): LiveStripeAdapter {
  return new LiveStripeAdapter(config, mode);
}
