import { loadTaukeiEnv, type RawEnv } from "@taukei/env";
import type { DeliveryJob } from "@taukei/domain";
import { verifyWebhookSignature } from "@taukei/lalamove";
import {
  mapV3StatusToDeliveryStatus,
  mapDeliveryToFulfillmentStatus,
  isValidDeliveryStatusTransition,
} from "@taukei/lalamove";
import { buildWebhookIdempotencyKey } from "./idempotency";

export type LalamoveEventType =
  | "ORDER_STATUS_CHANGED"
  | "DRIVER_ASSIGNED"
  | "ORDER_DELIVERED"
  | "ORDER_CANCELLED"
  | "ORDER_CREATED"
  | "ORDER_AMOUNT_CHANGED"
  | "ORDER_REPLACED"
  | "POD_STATUS_CHANGED";

export interface LalamoveEvent {
  eventType?: string;
  type?: string;
  eventId?: string;
  timestamp?: string | number;
  data: {
    orderId?: string;
    status?: string;
    driverId?: string;
    order?: Record<string, unknown>;
    metadata?: Record<string, string>;
    priceBreakdown?: Record<string, string>;
  };
}

export interface LalamoveWebhookProcessingResult {
  accepted: boolean;
  provider: "lalamove";
  eventId: string;
  eventType?: LalamoveEventType;
  idempotencyKey: string;
  status: "processed" | "duplicate" | "rejected";
  mode: "sandbox" | "live";
  lalamoveOrderId?: string;
  deliveryStatus?: string;
  fulfillmentStatus?: string;
  driverId?: string;
  reason: string;
}

export function parseLalamoveEvent(payload: string): LalamoveEvent | null {
  try {
    const parsed = JSON.parse(payload) as Partial<LalamoveEvent>;
    if (!parsed.data) return null;
    return parsed as LalamoveEvent;
  } catch {
    return null;
  }
}

export async function processLalamoveWebhook(
  payload: string,
  signature: string | null,
  requestPath: string = "/api/webhooks/lalamove",
  raw: RawEnv = process.env as RawEnv,
): Promise<LalamoveWebhookProcessingResult> {
  const env = loadTaukeiEnv(raw);
  const eventType =
    (JSON.parse(payload) as LalamoveEvent).eventType ??
    (JSON.parse(payload) as LalamoveEvent).type;

  // Lalamove validation ping (empty body)
  const trimmed = payload.trim();
  if (!signature && (trimmed === "" || trimmed === "{}")) {
    return {
      accepted: true,
      provider: "lalamove",
      eventId: "lalamove-validation-ping",
      idempotencyKey: buildWebhookIdempotencyKey("lalamove", "ping"),
      status: "processed",
      mode: env.lalamoveMode,
      reason: "Lalamove webhook URL validation ping acknowledged.",
    };
  }

  if (!env.lalamoveWebhookSecret) {
    return {
      accepted: false,
      provider: "lalamove",
      eventId: "lalamove-no-secret",
      idempotencyKey: buildWebhookIdempotencyKey("lalamove", "no-secret"),
      status: "rejected",
      mode: env.lalamoveMode,
      reason: "LALAMOVE_WEBHOOK_SECRET is not configured.",
    };
  }

  if (!signature) {
    return {
      accepted: false,
      provider: "lalamove",
      eventId: "lalamove-no-signature",
      idempotencyKey: buildWebhookIdempotencyKey("lalamove", "no-signature"),
      status: "rejected",
      mode: env.lalamoveMode,
      reason: "Missing Lalamove signature header.",
    };
  }

  const event = parseLalamoveEvent(payload);
  if (!event) {
    return {
      accepted: false,
      provider: "lalamove",
      eventId: "lalamove-invalid-event",
      idempotencyKey: buildWebhookIdempotencyKey("lalamove", "invalid-event"),
      status: "rejected",
      mode: env.lalamoveMode,
      reason: "Invalid Lalamove event payload.",
    };
  }

  // Verify v3 HMAC signature
  const timestamp = event.timestamp;
  const verified = verifyWebhookSignature(
    signature,
    env.lalamoveWebhookSecret,
    timestamp as string | number,
    requestPath,
    event.data,
  );

  if (!verified) {
    return {
      accepted: false,
      provider: "lalamove",
      eventId: "lalamove-invalid-sig",
      idempotencyKey: buildWebhookIdempotencyKey("lalamove", "invalid-sig"),
      status: "rejected",
      mode: env.lalamoveMode,
      reason: "Lalamove signature verification failed.",
    };
  }

  const lalamoveOrderId =
    event.data.order?.orderId ?? event.data.orderId ?? "";
  const eventId =
    event.eventId ?? `lm-${lalamoveOrderId}-${Date.now()}`;
  const idempotencyKey = buildWebhookIdempotencyKey("lalamove", eventId);

  // Map delivery status
  let deliveryStatus: string | undefined;
  let fulfillmentStatus: string | undefined;
  let driverId: string | undefined;

  const v3Status = event.data.status ?? event.data.order?.status as string | undefined;

  if (v3Status && eventType === "ORDER_STATUS_CHANGED") {
    const mapped = mapV3StatusToDeliveryStatus(v3Status as never);
    deliveryStatus = mapped;
    fulfillmentStatus = mapDeliveryToFulfillmentStatus(mapped) ?? undefined;
  }

  if (eventType === "DRIVER_ASSIGNED") {
    deliveryStatus = "driver_assigned";
    driverId = event.data.driverId ?? event.data.order?.driverId as string | undefined;
  }

  if (eventType === "ORDER_DELIVERED" || v3Status === "COMPLETED") {
    deliveryStatus = "delivered";
    fulfillmentStatus = "delivered";
  }

  if (eventType === "ORDER_CANCELLED" || v3Status === "CANCELED") {
    deliveryStatus = "cancelled";
    fulfillmentStatus = "cancelled";
  }

  return {
    accepted: true,
    provider: "lalamove",
    eventId,
    eventType: eventType as LalamoveEventType | undefined,
    idempotencyKey,
    status: "processed",
    mode: env.lalamoveMode,
    lalamoveOrderId,
    deliveryStatus,
    fulfillmentStatus,
    driverId,
    reason: `Lalamove ${eventType ?? "unknown"} processed.`,
  };
}

export function resetLalamoveWebhookIdempotencyForTests(): void {
  // No-op: DB-based idempotency
}
