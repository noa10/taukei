export type WebhookProvider = "stripe" | "lalamove";

export interface WebhookProductionGuardrail {
  idempotencyScope: "db-atomic-webhook-events";
  remotePersistence: true;
  productionReady: true;
  provider: WebhookProvider;
}

export function buildWebhookProductionGuardrail(
  provider: WebhookProvider,
): WebhookProductionGuardrail {
  return {
    idempotencyScope: "db-atomic-webhook-events",
    remotePersistence: true,
    productionReady: true,
    provider,
  };
}
