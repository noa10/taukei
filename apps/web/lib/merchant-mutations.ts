import { getSupabaseBoundaryConfig } from "./supabase/config";
import {
  assertMerchantTenantScope,
  type MerchantSession,
} from "./supabase/session";

export type MerchantMutationStatus =
  | "boundary-accepted"
  | "stubbed"
  | "rejected";
export type FulfillmentStatus =
  | "new"
  | "accepted"
  | "preparing"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface MerchantMutationResult<TPayload = unknown> {
  status: MerchantMutationStatus;
  merchantId: string;
  tenantScope: `merchant:${string}`;
  table: string;
  operation: "upsert" | "insert" | "update";
  payload?: TPayload;
  message: string;
  remotePersistence: false;
  productionGuardrail: string;
}

export interface MerchantProfileDefaultsInput {
  merchantId: string;
  storeName: string;
  city: string;
  kitchenPrepBufferMinutes: number;
  defaultVehicleType: "MOTORCYCLE" | "CAR";
  publicOrderingEnabled: boolean;
}

export interface CatalogItemMutationInput {
  merchantId: string;
  itemId: string;
  name?: string;
  priceCents?: number;
  isAvailable?: boolean;
  categoryName?: string;
}

export interface FulfillmentTransitionInput {
  merchantId: string;
  publicRef: string;
  nextStatus: FulfillmentStatus;
}

const legalFulfillmentTransitions: Record<
  FulfillmentStatus,
  FulfillmentStatus[]
> = {
  new: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["out_for_delivery"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

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
      "Rejected merchant mutation never writes remotely in the Taukei foundation.",
  };
}

function mutationStatus(): Exclude<MerchantMutationStatus, "rejected"> {
  return getSupabaseBoundaryConfig("server").mode === "configured"
    ? "boundary-accepted"
    : "stubbed";
}

function mutationGuardrail(): string {
  return "Merchant mutations are tenant-checked Supabase-shaped local evidence only; production persistence requires explicit RLS-scoped write repositories and integration evidence.";
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

export function upsertMerchantProfileDefaults(
  input: MerchantProfileDefaultsInput,
  session: MerchantSession,
): MerchantMutationResult {
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

  return {
    status: mutationStatus(),
    merchantId: session.merchantId,
    tenantScope: session.tenantScope,
    table: "stores",
    operation: "upsert",
    payload,
    message:
      "Merchant onboarding/profile defaults accepted by tenant-safe Supabase mutation boundary.",
    remotePersistence: false,
    productionGuardrail: mutationGuardrail(),
  };
}

export function upsertCatalogItem(
  input: CatalogItemMutationInput,
  session: MerchantSession,
): MerchantMutationResult {
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
  };

  return {
    status: mutationStatus(),
    merchantId: session.merchantId,
    tenantScope: session.tenantScope,
    table: "menu_items",
    operation: "upsert",
    payload,
    message: "Catalog item accepted by tenant-safe Supabase mutation boundary.",
    remotePersistence: false,
    productionGuardrail: mutationGuardrail(),
  };
}

export function transitionFulfillmentStatus(
  input: FulfillmentTransitionInput,
  session: MerchantSession,
): MerchantMutationResult {
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

  return {
    status: mutationStatus(),
    merchantId: session.merchantId,
    tenantScope: session.tenantScope,
    table: "fulfillment_events",
    operation: "insert",
    payload,
    message:
      "Fulfillment transition accepted by legal-transition Supabase mutation boundary.",
    remotePersistence: false,
    productionGuardrail: mutationGuardrail(),
  };
}

export function legalFulfillmentNextStatuses(
  status: FulfillmentStatus,
): FulfillmentStatus[] {
  return [...(legalFulfillmentTransitions[status] ?? [])];
}
