"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "./supabase/server";
import { getServerSupabaseUser } from "./supabase/server";
import type { MerchantSession } from "./supabase/session";
import {
  upsertMerchantProfileDefaults,
  upsertCatalogItem,
  transitionFulfillmentStatus,
} from "./merchant-mutations";
import type {
  MerchantProfileDefaultsInput,
  CatalogItemMutationInput,
  FulfillmentTransitionInput,
  MerchantMutationResult,
} from "./merchant-types";

// ---------------------------------------------------------------------------
// Session resolution for server actions
// ---------------------------------------------------------------------------

async function requireMerchantSession(): Promise<MerchantSession> {
  const { user, error } = await getServerSupabaseUser();
  if (!user) {
    throw new Error(error?.message ?? "Not authenticated. Please sign in.");
  }

  const client = await createServerSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  const { data: membership } = await client
    .from("merchant_memberships")
    .select("merchant_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership) {
    throw new Error("No merchant membership found. Complete onboarding first.");
  }

  return {
    userId: user.id,
    merchantId: membership.merchant_id as string,
    role: membership.role as MerchantSession["role"],
    email: user.email ?? "",
    tenantScope: `merchant:${membership.merchant_id}`,
    authMode: "supabase-rls",
  };
}

// ---------------------------------------------------------------------------
// Merchant profile / onboarding
// ---------------------------------------------------------------------------

export async function saveMerchantProfile(
  input: Omit<MerchantProfileDefaultsInput, "merchantId">,
): Promise<MerchantMutationResult> {
  const session = await requireMerchantSession();
  const result = await upsertMerchantProfileDefaults(
    { ...input, merchantId: session.merchantId },
    session,
  );
  if (result.status !== "rejected") {
    revalidatePath("/merchant");
    revalidatePath("/merchant/onboarding");
  }
  return result;
}

// ---------------------------------------------------------------------------
// Catalog CRUD
// ---------------------------------------------------------------------------

export async function saveCatalogItem(
  input: Omit<CatalogItemMutationInput, "merchantId">,
): Promise<MerchantMutationResult> {
  const session = await requireMerchantSession();
  const result = await upsertCatalogItem(
    { ...input, merchantId: session.merchantId },
    session,
  );
  if (result.status !== "rejected") {
    revalidatePath("/merchant/catalog");
  }
  return result;
}

export async function deleteCatalogItemAction(
  itemId: string,
): Promise<{ ok: boolean; message: string }> {
  const session = await requireMerchantSession();
  const client = await createServerSupabaseClient();
  if (!client) return { ok: false, message: "Supabase is not configured." };

  const { error } = await client
    .from("menu_items")
    .delete()
    .eq("id", itemId)
    .eq("merchant_id", session.merchantId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/merchant/catalog");
  return { ok: true, message: "Item deleted." };
}

export async function toggleCatalogItemAvailability(
  itemId: string,
  isAvailable: boolean,
): Promise<{ ok: boolean; message: string }> {
  const session = await requireMerchantSession();
  const client = await createServerSupabaseClient();
  if (!client) return { ok: false, message: "Supabase is not configured." };

  const { error } = await client
    .from("menu_items")
    .update({ is_available: isAvailable })
    .eq("id", itemId)
    .eq("merchant_id", session.merchantId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/merchant/catalog");
  return { ok: true, message: "Availability updated." };
}

// ---------------------------------------------------------------------------
// Fulfillment transitions
// ---------------------------------------------------------------------------

export async function transitionOrderStatus(
  publicRef: string,
  nextStatus: FulfillmentTransitionInput["nextStatus"],
): Promise<MerchantMutationResult> {
  const session = await requireMerchantSession();
  const result = await transitionFulfillmentStatus(
    { merchantId: session.merchantId, publicRef, nextStatus },
    session,
  );
  if (result.status !== "rejected") {
    revalidatePath("/merchant/fulfillment");
    revalidatePath("/merchant");
  }
  return result;
}

// ---------------------------------------------------------------------------
// New merchant + store + membership creation (onboarding)
// ---------------------------------------------------------------------------

export interface CreateMerchantInput {
  storeName: string;
  slug: string;
  description?: string;
  phone?: string;
  city: string;
  state?: string;
  addressLine1?: string;
  postcode?: string;
}

export async function createNewMerchant(
  input: CreateMerchantInput,
): Promise<{ ok: boolean; merchantId: string; message: string }> {
  const { user, error: authError } = await getServerSupabaseUser();
  if (!user) {
    return { ok: false, merchantId: "", message: authError?.message ?? "Not authenticated." };
  }

  const client = await createServerSupabaseClient();
  if (!client) {
    return { ok: false, merchantId: "", message: "Supabase is not configured." };
  }

  // 1. Create merchant
  const { data: merchant, error: merchantErr } = await client
    .from("merchants")
    .insert({
      slug: input.slug,
      display_name: input.storeName,
      legal_name: input.storeName,
      status: "draft",
    })
    .select("id")
    .single();

  if (merchantErr || !merchant) {
    return { ok: false, merchantId: "", message: merchantErr?.message ?? "Failed to create merchant." };
  }

  const merchantId = merchant.id as string;

  // 2. Create store
  const { error: storeErr } = await client.from("stores").insert({
    merchant_id: merchantId,
    slug: `${input.slug}-main`,
    name: input.storeName,
    description: input.description ?? null,
    phone: input.phone ?? null,
    address_line1: input.addressLine1 ?? null,
    city: input.city,
    state: input.state ?? "Kuala Lumpur",
    postcode: input.postcode ?? null,
    status: "draft",
    public_ordering_enabled: false,
  });

  if (storeErr) {
    // Roll back merchant
    await client.from("merchants").delete().eq("id", merchantId);
    return { ok: false, merchantId: "", message: `Failed to create store: ${storeErr.message}` };
  }

  // 3. Create membership (owner)
  const { error: membershipErr } = await client.from("merchant_memberships").insert({
    merchant_id: merchantId,
    user_id: user.id,
    role: "owner",
    status: "active",
  });

  if (membershipErr) {
    // Roll back merchant + store
    await client.from("stores").delete().eq("merchant_id", merchantId);
    await client.from("merchants").delete().eq("id", merchantId);
    return { ok: false, merchantId: "", message: `Failed to create membership: ${membershipErr.message}` };
  }

  // 4. Update profile default_merchant_id
  await client
    .from("profiles")
    .update({ default_merchant_id: merchantId })
    .eq("id", user.id);

  revalidatePath("/merchant");
  revalidatePath("/merchant/onboarding");

  return { ok: true, merchantId, message: "Merchant created successfully." };
}
