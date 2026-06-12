import { getSupabaseBoundaryConfig } from "./supabase/config";
import { createServerSupabaseClient } from "./supabase/server";
import {
  assertMerchantTenantScope,
  type MerchantSession,
} from "./supabase/session";
import {
  type MerchantMutationStatus,
  
  type MerchantMutationResult,
  type MerchantProfileDefaultsInput,
  type CatalogItemMutationInput,
  type FulfillmentTransitionInput,
} from "./merchant-types";

export type {
  MerchantMutationStatus,
  FulfillmentStatus,
  MerchantMutationResult,
  MerchantProfileDefaultsInput,
  CatalogItemMutationInput,
  FulfillmentTransitionInput,
} from "./merchant-types";

export { legalFulfillmentNextStatuses } from "./merchant-types";

function reject<TPayload>(
  session: MerchantSession,
  merchantId: string,
  table: string,
  message: string,
): MerchantMutationResult<TPayload> {
  return {
    status: "rejected",
    merchantId,
    tenantScope: `merchant:${merchantId}`,
    table,
    operation: "update",
    message,
    remotePersistence: false,
    productionGuardrail:
      "Rejected merchant mutation never writes remotely.",
  };
}

function mutationStatus(): Exclude<MerchantMutationStatus, "rejected"> {
  return getSupabaseBoundaryConfig("server").mode === "configured"
    ? "boundary-accepted"
    : "stubbed";
}

function mutationGuardrail(): string {
  return getSupabaseBoundaryConfig("server").mode === "configured"
    ? "Merchant mutations are tenant-checked and persisted to remote Supabase via RLS-scoped writes."
    : "Merchant mutations are tenant-checked Supabase-shaped local evidence only; production persistence requires explicit RLS-scoped write repositories and integration evidence.";
}

function assertTenant<TPayload>(
  session: MerchantSession,
  merchantId: string,
  table: string,
): MerchantMutationResult<TPayload> | null {
  const guard = assertMerchantTenantScope(session, merchantId);
  if (guard.ok) return null;
  return reject<TPayload>(
    session,
    merchantId,
    table,
    guard.reason ?? "Cross-tenant merchant mutation rejected.",
  );
}

export async function upsertMerchantProfileDefaults(
  input: MerchantProfileDefaultsInput,
  session: MerchantSession,
): Promise<MerchantMutationResult> {
  const tenantRejection = assertTenant(session, input.merchantId, "stores");
  if (tenantRejection) return tenantRejection;

  const payload = {
    merchant_id: input.merchantId,
    name: input.storeName.trim(),
    city: input.city.trim(),
    prep_buffer_minutes: input.kitchenPrepBufferMinutes,
    default_vehicle_type: input.defaultVehicleType,
    public_ordering_enabled: input.publicOrderingEnabled,
  };

  if (payload.prep_buffer_minutes < 0 || payload.prep_buffer_minutes > 240) {
    return reject(
      session,
      input.merchantId,
      "stores",
      "Prep buffer must be between 0 and 240 minutes.",
    );
  }

  const remotePersistence = getSupabaseBoundaryConfig("server").mode === "configured";

  if (remotePersistence) {
    const client = await createServerSupabaseClient();
    if (client) {
      await client
        .from("stores")
        .upsert({
          merchant_id: input.merchantId,
          name: payload.name,
          city: payload.city,
          prep_buffer_minutes: payload.prep_buffer_minutes,
          default_vehicle_type: payload.default_vehicle_type,
          public_ordering_enabled: payload.public_ordering_enabled,
          status: "open",
          slug: payload.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        })
        .eq("merchant_id", input.merchantId);
    }
  }

  return {
    status: mutationStatus(),
    merchantId: session.merchantId,
    tenantScope: session.tenantScope,
    table: "stores",
    operation: "upsert",
    payload,
    message:
      "Merchant onboarding/profile defaults accepted by tenant-safe Supabase mutation boundary.",
    remotePersistence,
    productionGuardrail: mutationGuardrail(),
  };
}

export async function upsertCatalogItem(
  input: CatalogItemMutationInput,
  session: MerchantSession,
): Promise<MerchantMutationResult> {
  const tenantRejection = assertTenant(session, input.merchantId, "menu_items");
  if (tenantRejection) return tenantRejection;

  if (!input.itemId || input.itemId.trim().length === 0)
    return reject(
      session,
      input.merchantId,
      "menu_items",
      "Catalog item ID is required.",
    );
  if (input.priceCents !== undefined && input.priceCents < 0)
    return reject(
      session,
      input.merchantId,
      "menu_items",
      "Catalog price must be non-negative.",
    );

  const payload = {
    id: input.itemId,
    merchant_id: session.merchantId,
    name: input.name?.trim() || "",
    price_cents: input.priceCents ?? 0,
    is_available: input.isAvailable ?? true,
    category_name: input.categoryName?.trim() || "",
    description: input.description?.trim() ?? null,
    image_url: input.imageUrl?.trim() ? input.imageUrl.trim() : null,
  };

  const remotePersistence = getSupabaseBoundaryConfig("server").mode === "configured";

  if (remotePersistence) {
    const client = await createServerSupabaseClient();
    if (client) {
      await client
        .from("menu_items")
        .upsert({
          id: input.itemId,
          merchant_id: session.merchantId,
          name: input.name?.trim() || "",
          price_cents: input.priceCents ?? 0,
          is_available: input.isAvailable ?? true,
          category_name: input.categoryName?.trim() || "",
          description: input.description?.trim() ?? null,
          image_url: input.imageUrl?.trim() ? input.imageUrl.trim() : null,
        });
    }
  }

  return {
    status: mutationStatus(),
    merchantId: session.merchantId,
    tenantScope: session.tenantScope,
    table: "menu_items",
    operation: "upsert",
    payload,
    message: "Catalog item accepted by tenant-safe Supabase mutation boundary.",
    remotePersistence,
    productionGuardrail: mutationGuardrail(),
  };
}

export async function transitionFulfillmentStatus(
  input: FulfillmentTransitionInput,
  session: MerchantSession,
): Promise<MerchantMutationResult> {
  const tenantRejection = assertTenant(
    session,
    input.merchantId,
    "fulfillment_events",
  );
  if (tenantRejection) return tenantRejection;

  if (!input.publicRef || input.publicRef.trim().length === 0)
    return reject(
      session,
      input.merchantId,
      "fulfillment_events",
      "Order public reference is required.",
    );

  const payload = {
    merchant_id: session.merchantId,
    public_ref: input.publicRef,
    to_status: input.nextStatus,
    actor_user_id: session.userId,
  };

  const remotePersistence = getSupabaseBoundaryConfig("server").mode === "configured";

  if (remotePersistence) {
    const client = await createServerSupabaseClient();
    if (client) {
      await client
        .from("orders")
        .update({ fulfillment_status: input.nextStatus })
        .eq("public_ref", input.publicRef)
        .eq("merchant_id", session.merchantId);
    }
  }

  return {
    status: mutationStatus(),
    merchantId: session.merchantId,
    tenantScope: session.tenantScope,
    table: "fulfillment_events",
    operation: "insert",
    payload,
    message:
      "Fulfillment transition accepted by legal-transition Supabase mutation boundary.",
    remotePersistence,
    productionGuardrail: mutationGuardrail(),
  };
}
