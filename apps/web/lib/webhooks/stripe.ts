import { createHmac, timingSafeEqual } from "node:crypto";
import { loadTaukeiEnv, type RawEnv } from "@taukei/env";
import type { PaymentSession } from "@taukei/domain";
import { buildWebhookIdempotencyKey } from "./idempotency";

export type StripeEventType =
  | "checkout.session.completed"
  | "checkout.session.async_payment_succeeded"
  | "checkout.session.async_payment_failed";

export interface StripeEvent {
  id: string;
  type: StripeEventType;
  livemode?: boolean;
  created?: number;
  data: {
    object: {
      id: string;
      payment_intent?: string;
      status?: string;
      payment_status?: "paid" | "unpaid" | "no_payment_required";
      amount_total?: number;
      currency?: string;
      metadata?: Record<string, string | undefined>;
    };
  };
}

export interface StripeWebhookProcessingResult {
  accepted: boolean;
  provider: "stripe";
  eventId: string;
  eventType?: StripeEventType;
  idempotencyKey: string;
  status: "processed" | "duplicate" | "rejected";
  mode: "sandbox" | "live";
  orderId?: string;
  merchantId?: string;
  orderStatus?: string;
  fulfillmentStatus?: string;
  reason: string;
}

export function createStripeTestSignature(
  payload: string,
  secret: string,
  timestamp = "1780000000",
): string {
  const digest = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

export function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const parsed = signature.split(",").reduce<{
    timestamp?: string;
    signatures: string[];
  }>(
    (acc, part) => {
      const [key, value] = part.split("=", 2);
      if (key === "t") acc.timestamp = value;
      if (key === "v1" && value) acc.signatures.push(value);
      return acc;
    },
    { signatures: [] },
  );

  if (!parsed.timestamp || parsed.signatures.length === 0) return false;

  const expected = createHmac("sha256", secret)
    .update(`${parsed.timestamp}.${payload}`)
    .digest();

  return parsed.signatures.some((candidate) => {
    try {
      const actual = Buffer.from(candidate, "hex");
      return (
        actual.length === expected.length &&
        timingSafeEqual(actual, expected)
      );
    } catch {
      return false;
    }
  });
}

export function parseStripeEvent(payload: string): StripeEvent | null {
  try {
    const parsed = JSON.parse(payload) as Partial<StripeEvent>;
    if (!parsed.id || !parsed.type || !parsed.data?.object?.id) return null;
    if (
      ![
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
        "checkout.session.async_payment_failed",
      ].includes(parsed.type)
    )
      return null;
    return parsed as StripeEvent;
  } catch {
    return null;
  }
}

export async function processStripeWebhook(
  payload: string,
  signature: string | null,
  raw: RawEnv = process.env as RawEnv,
): Promise<StripeWebhookProcessingResult> {
  const env = loadTaukeiEnv(raw);

  if (!env.stripeWebhookSecret) {
    return {
      accepted: false,
      provider: "stripe",
      eventId: "stripe-no-secret",
      idempotencyKey: buildWebhookIdempotencyKey("stripe", "no-secret"),
      status: "rejected",
      mode: env.stripeMode,
      reason: "STRIPE_WEBHOOK_SECRET is not configured.",
    };
  }

  if (!signature) {
    return {
      accepted: false,
      provider: "stripe",
      eventId: "stripe-no-signature",
      idempotencyKey: buildWebhookIdempotencyKey("stripe", "no-signature"),
      status: "rejected",
      mode: env.stripeMode,
      reason: "Missing stripe-signature header.",
    };
  }

  const verified = verifyStripeSignature(
    payload,
    signature,
    env.stripeWebhookSecret,
  );

  if (!verified) {
    return {
      accepted: false,
      provider: "stripe",
      eventId: "stripe-invalid-sig",
      idempotencyKey: buildWebhookIdempotencyKey("stripe", "invalid-sig"),
      status: "rejected",
      mode: env.stripeMode,
      reason: "Stripe signature verification failed.",
    };
  }

  const event = parseStripeEvent(payload);
  if (!event) {
    return {
      accepted: false,
      provider: "stripe",
      eventId: "stripe-invalid-event",
      idempotencyKey: buildWebhookIdempotencyKey("stripe", "invalid-event"),
      status: "rejected",
      mode: env.stripeMode,
      reason: "Invalid Stripe event payload.",
    };
  }

  const idempotencyKey = buildWebhookIdempotencyKey("stripe", event.id);
  const metadata = event.data.object.metadata;
  const orderId = metadata?.orderRef ?? metadata?.order_id;
  const merchantId = metadata?.merchantId ?? metadata?.merchant_id;

  return {
    accepted: true,
    provider: "stripe",
    eventId: event.id,
    eventType: event.type,
    idempotencyKey,
    status: "processed",
    mode: env.stripeMode,
    orderId,
    merchantId,
    orderStatus:
      event.type === "checkout.session.async_payment_failed"
        ? "cancelled"
        : "confirmed",
    fulfillmentStatus:
      event.type === "checkout.session.async_payment_failed"
        ? undefined
        : "preparing",
    reason: `Stripe ${event.type} processed.`,
  };
}

export function resetStripeWebhookIdempotencyForTests(): void {
  // No-op: DB-based idempotency doesn't need process-local reset
}
