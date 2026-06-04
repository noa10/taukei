export type WebhookProvider = "stripe" | "lalamove";

export const WEBHOOK_IDEMPOTENCY_PRODUCTION_GUARDRAIL =
  "Foundation webhook idempotency is process-local demo evidence only; live or horizontally scaled handling must use atomic Supabase webhook_events insert/upsert uniqueness.";

export const WEBHOOK_SERVICE_ROLE_PRODUCTION_GUARDRAIL =
  "Service-role Supabase clients must remain private to future webhook persistence helpers; routes may assert caller boundaries but must not construct or expose clients.";

export interface WebhookProductionGuardrail {
  idempotencyScope: "process-local-foundation-only";
  remotePersistence: false;
  productionReady: false;
  requiresAtomicWebhookEvents: true;
  provider: WebhookProvider;
  evidence: string;
  serviceRoleBoundary: string;
}

export function buildWebhookProductionGuardrail(
  provider: WebhookProvider,
): WebhookProductionGuardrail {
  return {
    idempotencyScope: "process-local-foundation-only",
    remotePersistence: false,
    productionReady: false,
    requiresAtomicWebhookEvents: true,
    provider,
    evidence: WEBHOOK_IDEMPOTENCY_PRODUCTION_GUARDRAIL,
    serviceRoleBoundary: WEBHOOK_SERVICE_ROLE_PRODUCTION_GUARDRAIL,
  };
}
