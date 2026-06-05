import { createHmac, timingSafeEqual } from "node:crypto";
import { loadTaukeiEnv, type RawEnv } from "@taukei/env";
import type { DeliveryJob } from "@taukei/domain";
import { buildWebhookIdempotencyKey } from "./idempotency";
import {
  buildWebhookProductionGuardrail,
  type WebhookProductionGuardrail,
} from "./production-guardrails";

export interface LalamoveWebhookRawEnv extends RawEnv {
  LALAMOVE_WEBHOOK_SECRET?: string;
}

export type LalamoveDeterministicEventType =
  | "ORDER_STATUS_CHANGED"
  | "DRIVER_ASSIGNED"
  | "ORDER_DELIVERED"
  | "ORDER_CANCELLED";
export type LalamoveDeliveryStatus =
  | "scheduled"
  | "driver_assigned"
  | "picked_up"
  | "delivered"
  | "cancelled";

export interface LalamoveDeterministicEvent {
  id: string;
  type: LalamoveDeterministicEventType;
  livemode?: boolean;
  data: {
    orderId: string;
    status?:
      | "ASSIGNING_DRIVER"
      | "ON_GOING"
      | "PICKED_UP"
      | "COMPLETED"
      | "CANCELLED";
    driverId?: string;
    metadata?: Record<string, string | undefined>;
  };
}

export interface LalamoveWebhookRecord {
  id: string;
  provider: "lalamove";
  event_id: string;
  event_type: LalamoveDeterministicEventType;
  idempotency_key: string;
  duplicate: boolean;
  mode: "fake" | "sandbox";
  no_live_side_effect: true;
}

export interface LalamoveDeliveryReconciliation {
  order_ref: string;
  provider_job_id: string;
  previous_status: string;
  next_status: LalamoveDeliveryStatus;
  driver_id?: string;
  no_live_booking: true;
}

export interface LalamoveWebhookProcessingResult {
  accepted: boolean;
  provider: "lalamove";
  eventId: string;
  eventType?: LalamoveDeterministicEventType;
  idempotencyKey: string;
  status: "processed" | "duplicate" | "rejected";
  mode: "fake" | "sandbox";
  serviceRoleBoundary: "service-role-supabase-boundary";
  noLiveSideEffect: true;
  productionGuardrail: WebhookProductionGuardrail;
  webhookEvent?: LalamoveWebhookRecord;
  reconciliation?: LalamoveDeliveryReconciliation;
  reason: string;
}

// Foundation-only idempotency cache: deterministic local tests/demo evidence only.
// Production or horizontally scaled webhook handling must replace this with an atomic
// Supabase `webhook_events` insert/upsert using provider/event and idempotency-key uniqueness.
const processedLalamoveEvents = new Map<
  string,
  LalamoveWebhookProcessingResult
>();

function rawProcessEnv(): LalamoveWebhookRawEnv {
  return process.env as LalamoveWebhookRawEnv;
}

function getWebhookSecret(raw: LalamoveWebhookRawEnv): string | undefined {
  return (
    raw.LALAMOVE_WEBHOOK_SECRET?.trim() ||
    raw.LALAMOVE_API_SECRET?.trim() ||
    undefined
  );
}

export function createLalamoveTestSignature(
  payload: string,
  secret: string,
): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyLalamoveSignatureWhenConfigured(
  payload: string,
  signature: string | null,
  raw: LalamoveWebhookRawEnv = rawProcessEnv(),
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
            "Missing Lalamove signature header for deterministic Lalamove adapter.",
        };
  }
  if (!signature)
    return {
      ok: false,
      configured: true,
      reason:
        "Missing Lalamove signature header while webhook secret is configured.",
    };

  const expected = createHmac("sha256", secret).update(payload).digest();
  try {
    const actual = Buffer.from(signature, "hex");
    if (actual.length === expected.length && timingSafeEqual(actual, expected))
      return { ok: true, configured: true };
  } catch {
    // fall through to rejection
  }
  return {
    ok: false,
    configured: true,
    reason: "Lalamove signature verification failed.",
  };
}

function parseLalamoveEvent(
  payload: string,
): LalamoveDeterministicEvent | null {
  try {
    const parsed = JSON.parse(payload) as Partial<LalamoveDeterministicEvent>;
    if (!parsed.id || !parsed.type || !parsed.data?.orderId) return null;
    if (
      ![
        "ORDER_STATUS_CHANGED",
        "DRIVER_ASSIGNED",
        "ORDER_DELIVERED",
        "ORDER_CANCELLED",
      ].includes(parsed.type)
    )
      return null;
    return parsed as LalamoveDeterministicEvent;
  } catch {
    return null;
  }
}

function buildMinimalDeliveryJob(): DeliveryJob {
  return {
    id: crypto.randomUUID(),
    provider: "lalamove",
    mode: "fake",
    status: "scheduled",
    vehicleType: "MOTORCYCLE",
    scheduledDispatchAt: new Date().toISOString(),
    noLiveBooking: true,
    metadata: {},
  };
}

function nextDeliveryStatus(
  event: LalamoveDeterministicEvent,
): LalamoveDeliveryStatus {
  if (event.type === "DRIVER_ASSIGNED") return "driver_assigned";
  if (event.type === "ORDER_DELIVERED") return "delivered";
  if (event.type === "ORDER_CANCELLED") return "cancelled";
  switch (event.data.status) {
    case "ON_GOING":
      return "driver_assigned";
    case "PICKED_UP":
      return "picked_up";
    case "COMPLETED":
      return "delivered";
    case "CANCELLED":
      return "cancelled";
    default:
      return "scheduled";
  }
}

export async function processDeterministicLalamoveWebhook(
  payload: string,
  signature: string | null,
  raw: LalamoveWebhookRawEnv = rawProcessEnv(),
): Promise<LalamoveWebhookProcessingResult> {
  const env = loadTaukeiEnv(raw);
  if (env.lalamoveMode === "live") {
    return {
      accepted: false,
      provider: "lalamove",
      eventId: "lalamove-live-rejected",
      idempotencyKey: buildWebhookIdempotencyKey(
        "lalamove",
        "lalamove-live-rejected",
      ),
      status: "rejected",
      mode: "sandbox",
      serviceRoleBoundary: "service-role-supabase-boundary",
      noLiveSideEffect: true,
      productionGuardrail: buildWebhookProductionGuardrail("lalamove"),
      reason:
        "Live Lalamove webhook side effects are disabled in the Taukei foundation.",
    };
  }

  const signatureResult = verifyLalamoveSignatureWhenConfigured(
    payload,
    signature,
    raw,
  );
  if (!signatureResult.ok) {
    return {
      accepted: false,
      provider: "lalamove",
      eventId: "lalamove-signature-rejected",
      idempotencyKey: buildWebhookIdempotencyKey(
        "lalamove",
        "lalamove-signature-rejected",
      ),
      status: "rejected",
      mode: env.lalamoveMode,
      serviceRoleBoundary: "service-role-supabase-boundary",
      noLiveSideEffect: true,
      productionGuardrail: buildWebhookProductionGuardrail("lalamove"),
      reason: signatureResult.reason,
    };
  }

  const event = parseLalamoveEvent(payload);
  if (!event) {
    return {
      accepted: false,
      provider: "lalamove",
      eventId: "lalamove-invalid-event",
      idempotencyKey: buildWebhookIdempotencyKey(
        "lalamove",
        "lalamove-invalid-event",
      ),
      status: "rejected",
      mode: env.lalamoveMode,
      serviceRoleBoundary: "service-role-supabase-boundary",
      noLiveSideEffect: true,
      productionGuardrail: buildWebhookProductionGuardrail("lalamove"),
      reason:
        "Lalamove event payload must include id, supported type, and data.orderId.",
    };
  }
  if (event.livemode) {
    return {
      accepted: false,
      provider: "lalamove",
      eventId: event.id,
      eventType: event.type,
      idempotencyKey: buildWebhookIdempotencyKey("lalamove", event.id),
      status: "rejected",
      mode: env.lalamoveMode,
      serviceRoleBoundary: "service-role-supabase-boundary",
      noLiveSideEffect: true,
      productionGuardrail: buildWebhookProductionGuardrail("lalamove"),
      reason:
        "Live Lalamove event payload rejected by no-live-side-effect guard.",
    };
  }

  const idempotencyKey = buildWebhookIdempotencyKey("lalamove", event.id);
  const previous = processedLalamoveEvents.get(idempotencyKey);
  if (previous) {
    return {
      ...previous,
      accepted: true,
      status: "duplicate",
      webhookEvent: previous.webhookEvent
        ? { ...previous.webhookEvent, duplicate: true }
        : undefined,
      reason: `Duplicate Lalamove event ${event.id} ignored after first reconciliation.`,
    };
  }

  const deliveryJob = buildMinimalDeliveryJob();
  const orderRef =
    event.data.metadata?.orderRef ??
    event.data.metadata?.order_ref ??
    event.data.orderId;
  const result: LalamoveWebhookProcessingResult = {
    accepted: true,
    provider: "lalamove",
    eventId: event.id,
    eventType: event.type,
    idempotencyKey,
    status: "processed",
    mode: env.lalamoveMode,
    serviceRoleBoundary: "service-role-supabase-boundary",
    noLiveSideEffect: true,
    productionGuardrail: buildWebhookProductionGuardrail("lalamove"),
    webhookEvent: {
      id: `webhook_${idempotencyKey.replace(/[^a-z0-9]+/gi, "_")}`,
      provider: "lalamove",
      event_id: event.id,
      event_type: event.type,
      idempotency_key: idempotencyKey,
      duplicate: false,
      mode: env.lalamoveMode,
      no_live_side_effect: true,
    },
    reconciliation: {
      order_ref: orderRef,
      provider_job_id: event.data.orderId,
      previous_status: deliveryJob.status,
      next_status: nextDeliveryStatus(event),
      ...(event.data.driverId ? { driver_id: event.data.driverId } : {}),
      no_live_booking: true,
    },
    reason: `Lalamove ${event.type} reconciled deterministically without network calls or rider booking.`,
  };
  processedLalamoveEvents.set(idempotencyKey, result);
  return result;
}

export function resetLalamoveWebhookIdempotencyForTests(): void {
  processedLalamoveEvents.clear();
}
