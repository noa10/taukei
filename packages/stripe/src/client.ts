import Stripe from "stripe";

export interface StripeClientConfig {
  secretKey: string;
  webhookSecret: string;
}

export interface CreateCheckoutSessionParams {
  amountCents: number;
  currency?: string;
  merchantName: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export class StripeClient {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(config: StripeClientConfig) {
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: "2026-05-27.dahlia" as Stripe.LatestApiVersion,
    });
    this.webhookSecret = config.webhookSecret;
  }

  get instance(): Stripe {
    return this.stripe;
  }

  async createCheckoutSession(
    params: CreateCheckoutSessionParams,
  ): Promise<Stripe.Checkout.Session> {
    const {
      amountCents,
      currency = "myr",
      merchantName,
      customerEmail,
      successUrl,
      cancelUrl,
      metadata = {},
    } = params;

    const sessionParams = {
      payment_method_types: ["fpx", "grabpay", "card"] as string[],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `Order from ${merchantName}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment" as const,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      ...(customerEmail ? { customer_email: customerEmail } : {}),
    };

    return this.stripe.checkout.sessions.create(sessionParams as Stripe.Checkout.SessionCreateParams);
  }

  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
  ): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret,
    );
  }
}

export function createStripeClient(config: StripeClientConfig): StripeClient {
  return new StripeClient(config);
}
