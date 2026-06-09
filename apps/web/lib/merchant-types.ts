// ─── Pure types and state machine — safe for client import ──────────

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
  remotePersistence: boolean;
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
  description?: string;
  imageUrl?: string;
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

export function legalFulfillmentNextStatuses(
  status: FulfillmentStatus,
): FulfillmentStatus[] {
  return [...(legalFulfillmentTransitions[status] ?? [])];
}

export const FULFILLMENT_STATUS_ORDER: FulfillmentStatus[] = [
  "new",
  "accepted",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

// ---------------------------------------------------------------------------
// Catalog item shape used by the merchant catalog UI
// ---------------------------------------------------------------------------

export interface CatalogItem {
  id: string;
  merchantId: string;
  name: string;
  priceCents: number;
  isAvailable: boolean;
  categoryName: string;
  description?: string;
  imageUrl?: string;
}
