"use server";

import { upsertCatalogItem, transitionFulfillmentStatus, upsertMerchantProfileDefaults, type MerchantMutationResult } from "../../lib/merchant-mutations";
import { getServerSupabaseBoundary } from "../../lib/supabase/server";

export type MerchantActionResult = MerchantMutationResult & {
  boundary: string;
};

function withBoundary(result: MerchantMutationResult): MerchantActionResult {
  return {
    ...result,
    boundary: getServerSupabaseBoundary().kind
  };
}

export async function upsertMerchantProfileDefaultsAction(input: {
  merchantId: string;
  storeName: string;
  city: string;
  kitchenPrepBufferMinutes: number;
  defaultVehicleType: "MOTORCYCLE" | "CAR";
  publicOrderingEnabled: boolean;
}): Promise<MerchantActionResult> {
  return withBoundary(upsertMerchantProfileDefaults(input));
}

export async function upsertCatalogItemAction(input: { merchantId: string; itemId: string; name?: string; priceCents?: number; isAvailable?: boolean; categoryName?: string }): Promise<MerchantActionResult> {
  return withBoundary(upsertCatalogItem(input));
}

export async function updateFulfillmentStatusAction(input: { merchantId: string; publicRef: string; nextStatus: "new" | "accepted" | "preparing" | "ready_for_pickup" | "out_for_delivery" | "delivered" | "cancelled" }): Promise<MerchantActionResult> {
  return withBoundary(transitionFulfillmentStatus(input));
}
