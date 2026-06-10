import { loadTaukeiEnv, type RawEnv } from "@taukei/env";
import type { IntegrationMode } from "@taukei/env";
import type { PaymentSession, PaymentSessionRequest, StripePort } from "../types";
import { LiveStripeAdapter } from "@taukei/stripe";

export { LiveStripeAdapter } from "@taukei/stripe";

export function createStripeAdapterFromEnv(raw?: RawEnv): StripePort {
  const env = loadTaukeiEnv(raw);
  return new LiveStripeAdapter(
    {
      secretKey: env.stripeSecretKey,
      webhookSecret: env.stripeWebhookSecret,
    },
    env.stripeMode,
  );
}
