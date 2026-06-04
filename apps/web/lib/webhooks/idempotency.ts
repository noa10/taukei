export type WebhookProvider = "stripe" | "lalamove";

export interface WebhookBoundaryResult {
  accepted: boolean;
  provider: WebhookProvider;
  eventId: string;
  idempotencyKey: string;
  status: "stubbed" | "duplicate" | "rejected";
  reason: string;
}

export function buildWebhookIdempotencyKey(provider: WebhookProvider, eventId: string): string {
  const safeEventId = eventId.trim();
  if (!safeEventId) return `${provider}:missing-event-id`;
  return `${provider}:${safeEventId}`;
}

export function createStubbedWebhookResult(provider: WebhookProvider, eventId: string, reason: string): WebhookBoundaryResult {
  return {
    accepted: true,
    provider,
    eventId,
    idempotencyKey: buildWebhookIdempotencyKey(provider, eventId),
    status: "stubbed",
    reason
  };
}
