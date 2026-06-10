export type WebhookProvider = "stripe" | "lalamove";

export function buildWebhookIdempotencyKey(provider: WebhookProvider, eventId: string): string {
  const safeEventId = eventId.trim();
  if (!safeEventId) return `${provider}:missing-event-id`;
  return `${provider}:${safeEventId}`;
}
