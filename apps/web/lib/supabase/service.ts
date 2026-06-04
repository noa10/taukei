import { assertSupabaseConfigured, getSupabaseBoundaryConfig, type SupabaseBoundaryConfig } from "./config";

export type ServiceRoleCaller = "stripe-webhook" | "lalamove-webhook";

export interface ServiceRoleSupabaseBoundary {
  kind: "service-role-supabase-boundary";
  config: SupabaseBoundaryConfig;
  allowedCaller?: ServiceRoleCaller;
  confinedToWebhooks: true;
  assertConfigured(): void;
}

// Service-role client construction must remain private to future webhook persistence helpers.
// Routes may assert this boundary, but production writes must not expose service-role clients directly.
export function getServiceRoleSupabaseBoundary(allowedCaller?: ServiceRoleCaller): ServiceRoleSupabaseBoundary {
  const config = getSupabaseBoundaryConfig("service-role");
  return {
    kind: "service-role-supabase-boundary",
    config,
    ...(allowedCaller ? { allowedCaller } : {}),
    confinedToWebhooks: true,
    assertConfigured: () => assertSupabaseConfigured(config)
  };
}

export function assertWebhookServiceRoleCaller(boundary: ServiceRoleSupabaseBoundary, caller: ServiceRoleCaller): void {
  if (boundary.allowedCaller && boundary.allowedCaller !== caller) {
    throw new Error(`Service-role boundary confined to ${boundary.allowedCaller}; received ${caller}.`);
  }
}
