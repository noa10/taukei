import { createHmac, timingSafeEqual } from "node:crypto";
import { loadTaukeiEnv, type RawEnv } from "@taukei/env";
import { buildCustomerOrderRecords } from "../customer-orders";
import { demoCheckoutRequest } from "../demo-data";
import {
  createCheckoutDraft,
  createLalamoveAdapterFromEnv,
  createStripeAdapterFromEnv,
} from "@taukei/domain";
import { buildWebhookIdempotencyKey } from "./idempotency";
import {
  buildWebhookProductionGuardrail,
  type WebhookProductionGuardrail,
} from "./production-guardrails";

export type StripeDeterministicEventType =
  | "checkout.session.completed"
  | "payment_intent.succeeded"
  | "payment_intent.payment_failed";

export interface StripeWebhookRawEnv extends RawEnv {
  STRIPE_WEBHOOK_SECRET?: string;
}

export interface StripeDeterministicEvent {
  id: string;
  type: StripeDeterministicEventType;
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

export interface StripeWebhookRecord {
  id: string;
  provider: "stripe";
  event_id: string;
  event_type: StripeDeterministicEventType;
  idempotency_key: string;
  duplicate: boolean;
  mode: "fake" | "sandbox";
  no_live_side_effect: true;
}

export interface StripePaymentReconciliation {
  order_ref: string;
  provider_session_id: string;
  provider_payment_intent_id?: string;
  previous_status: string;
  next_status: "paid" | "failed" | "requires_payment_method";
  amount_cents: number;
  currency: string;
  no_live_payment: true;
}

export interface StripeWebhookProcessingResult {
  accepted: boolean;
  provider: "stripe";
  eventId: string;
  eventType?: StripeDeterministicEventType;
  idempotencyKey: string;
  status: "processed" | "duplicate" | "rejected";
  mode: "fake" | "sandbox";
  serviceRoleBoundary: "service-role-supabase-boundary";
  noLiveSideEffect: true;
  productionGuardrail: WebhookProductionGuardrail;
  webhookEvent?: StripeWebhookRecord;
  reconciliation?: StripePaymentReconciliation;
  reason: string;
}

// Foundation-only idempotency cache: deterministic local tests/demo evidence only.
// Production or horizontally scaled webhook handling must replace this with an atomic
// Supabase `webhook_events` insert/upsert using provider/event and idempotency-key uniqueness.
const processedStripeEvents = new Map<string, StripeWebhookProcessingResult>();

function rawProcessEnv(): RawEnv {
  return process.env as RawEnv;
}

function getWebhookSecret(raw: StripeWebhookRawEnv): string | undefined {
  return raw.STRIPE_WEBHOOK_SECRET?.trim() || undefined;
}

function parseStripeSignature(signature: string): {
  timestamp?: string;
  signatures: string[];
} {
  return signature
    .split(",")
    .reduce<{ timestamp?: string; signatures: string[] }>(
      (acc, part) => {
        const [key, value] = part.split("=", 2);
        if (key === "t") acc.timestamp = value;
        if (key === "v1" && value) acc.signatures.push(value);
        return acc;
      },
      { signatures: [] },
    );
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

export function verifyStripeSignatureWhenConfigured(
  payload: string,
  signature: string | null,
  raw: StripeWebhookRawEnv = rawProcessEnv(),
):
  | { ok: true; configured: boolean }
  | { ok: false; configured: boolean; reason: string } {
  const secret = getWebhookSecret(raw);
  if (!secret) {
    return signature
      ? { ok: true, configured: false }
      : {
          ok: false,
          configured: false,
          reason:
            "Missing stripe-signature header for deterministic Stripe adapter.",
        };
  }
  if (!signature)
    return {
      ok: false,
      configured: true,
      reason:
        "Missing stripe-signature header while STRIPE_WEBHOOK_SECRET is configured.",
    };

  const parsed = parseStripeSignature(signature);
  if (!parsed.timestamp || parsed.signatures.length === 0)
    return {
      ok: false,
      configured: true,
      reason: "Invalid stripe-signature format.",
    };

  const expected = createHmac("sha256", secret)
    .update(`${parsed.timestamp}.${payload}`)
    .digest();
  const matched = parsed.signatures.some((candidate) => {
    try {
      const actual = Buffer.from(candidate, "hex");
      return (
        actual.length === expected.length && timingSafeEqual(actual, expected)
      );
    } catch {
      return false;
    }
  });

  return matched
    ? { ok: true, configured: true }
    : {
        ok: false,
        configured: true,
        reason: "Stripe signature verification failed.",
      };
}

function parseStripeEvent(payload: string): StripeDeterministicEvent | null {
  try {
    const parsed = JSON.parse(payload) as Partial<StripeDeterministicEvent>;
    if (!parsed.id || !parsed.type || !parsed.data?.object?.id) return null;
    if (
      ![
        "checkout.session.completed",
        "payment_intent.succeeded",
        "payment_intent.payment_failed",
      ].includes(parsed.type)
    )
      return null;
    return parsed as StripeDeterministicEvent;
  } catch {
    return null;
  }
}

async function buildDemoPaymentSession() {
  const draft = await createCheckoutDraft(
    { ...demoCheckoutRequest, catalog: demoCheckoutRequest.catalog },
    {
      stripe: createStripeAdapterFromEnv(),
      lalamove: createLalamoveAdapterFromEnv(),
    },
    {
      now: new Date("2026-06-04T12:00:00.000Z"),
      orderRefFactory: () => "TK-DEMO-1001",
      successUrl: "http://localhost:3000/order/TK-DEMO-1001",
      cancelUrl: "http://localhost:3000/mad-krapow-demo",
    },
  );
  return buildCustomerOrderRecords(draft).paymentSession;
}

function nextPaymentStatus(
  event: StripeDeterministicEvent,
): StripePaymentReconciliation["next_status"] {
  if (event.type === "payment_intent.payment_failed") return "failed";
  if (
    event.data.object.payment_status === "paid" ||
    event.type === "payment_intent.succeeded"
  )
    return "paid";
  return "requires_payment_method";
}

export async function processDeterministicStripeWebhook(
  payload: string,
  signature: string | null,
  raw: StripeWebhookRawEnv = rawProcessEnv(),
): Promise<StripeWebhookProcessingResult> {
  const env = loadTaukeiEnv(raw);
  if (env.stripeMode === "live") {
    return {
      accepted: false,
      provider: "stripe",
      eventId: "stripe-live-rejected",
      idempotencyKey: buildWebhookIdempotencyKey(
        "stripe",
        "stripe-live-rejected",
      ),
      status: "rejected",
      mode: "sandbox",
      serviceRoleBoundary: "service-role-supabase-boundary",
      noLiveSideEffect: true,
      productionGuardrail: buildWebhookProductionGuardrail("stripe"),
      reason:
        "Live Stripe webhook side effects are disabled in the Taukei foundation.",
    };
  }

  const signatureResult = verifyStripeSignatureWhenConfigured(
    payload,
    signature,
    raw,
  );
  if (!signatureResult.ok) {
    return {
      accepted: false,
      provider: "stripe",
      eventId: "stripe-signature-rejected",
      idempotencyKey: buildWebhookIdempotencyKey(
        "stripe",
        "stripe-signature-rejected",
      ),
      status: "rejected",
      mode: env.stripeMode,
      serviceRoleBoundary: "service-role-supabase-boundary",
      noLiveSideEffect: true,
      productionGuardrail: buildWebhookProductionGuardrail("stripe"),
      reason: signatureResult.reason,
    };
  }

  const event = parseStripeEvent(payload);
  if (!event) {
    return {
      accepted: false,
      provider: "stripe",
      eventId: "stripe-invalid-event",
      idempotencyKey: buildWebhookIdempotencyKey(
        "stripe",
        "stripe-invalid-event",
      ),
      status: "rejected",
      mode: env.stripeMode,
      serviceRoleBoundary: "service-role-supabase-boundary",
      noLiveSideEffect: true,
      productionGuardrail: buildWebhookProductionGuardrail("stripe"),
      reason:
        "Stripe event payload must include id, supported type, and data.object.id.",
    };
  }
  if (event.livemode) {
    return {
      accepted: false,
      provider: "stripe",
      eventId: event.id,
      eventType: event.type,
      idempotencyKey: buildWebhookIdempotencyKey("stripe", event.id),
      status: "rejected",
      mode: env.stripeMode,
      serviceRoleBoundary: "service-role-supabase-boundary",
      noLiveSideEffect: true,
      productionGuardrail: buildWebhookProductionGuardrail("stripe"),
      reason:
        "Live Stripe event payload rejected by no-live-side-effect guard.",
    };
  }

  const idempotencyKey = buildWebhookIdempotencyKey("stripe", event.id);
  const previous = processedStripeEvents.get(idempotencyKey);
  if (previous) {
    return {
      ...previous,
      accepted: true,
      status: "duplicate",
      webhookEvent: previous.webhookEvent
        ? { ...previous.webhookEvent, duplicate: true }
        : undefined,
      reason: `Duplicate Stripe event ${event.id} ignored after first reconciliation.`,
    };
  }

  const paymentSession = await buildDemoPaymentSession();
  const amount = event.data.object.amount_total ?? paymentSession.amount_cents;
  const currency = (event.data.object.currency ?? "myr").toUpperCase();
  const orderRef =
    event.data.object.metadata?.orderRef ??
    event.data.object.metadata?.order_ref ??
    "TK-DEMO-1001";
  const result: StripeWebhookProcessingResult = {
    accepted: true,
    provider: "stripe",
    eventId: event.id,
    eventType: event.type,
    idempotencyKey,
    status: "processed",
    mode: env.stripeMode,
    serviceRoleBoundary: "service-role-supabase-boundary",
    noLiveSideEffect: true,
    productionGuardrail: buildWebhookProductionGuardrail("stripe"),
    webhookEvent: {
      id: `webhook_${idempotencyKey.replace(/[^a-z0-9]+/gi, "_")}`,
      provider: "stripe",
      event_id: event.id,
      event_type: event.type,
      idempotency_key: idempotencyKey,
      duplicate: false,
      mode: env.stripeMode,
      no_live_side_effect: true,
    },
    reconciliation: {
      order_ref: orderRef,
      provider_session_id: event.data.object.id,
      ...(event.data.object.payment_intent
        ? { provider_payment_intent_id: event.data.object.payment_intent }
        : {}),
      previous_status: paymentSession.status,
      next_status: nextPaymentStatus(event),
      amount_cents: amount,
      currency,
      no_live_payment: true,
    },
    reason: `Stripe ${event.type} reconciled deterministically without network calls or payment capture.`,
  };
  processedStripeEvents.set(idempotencyKey, result);
  return result;
}

export function resetStripeWebhookIdempotencyForTests(): void {
  processedStripeEvents.clear();
}
