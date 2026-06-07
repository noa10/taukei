import type { MenuItemSnapshot } from "@taukei/domain";
import { getSupabaseBoundaryConfig } from "./supabase/config";
import { createServerSupabaseClient } from "./supabase/server";
import {
  assertMerchantTenantScope,
  type MerchantSession,
} from "./supabase/session";

// ---------------------------------------------------------------------------
// Menu structure types (categories + modifiers for storefront grouping)

export interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  description: string | null;
  minSelections: number;
  maxSelections: number;
}

export interface Modifier {
  id: string;
  modifierGroupId: string;
  name: string;
  priceDeltaCents: number;
  isDefault: boolean;
  isAvailable: boolean;
}

export interface ItemModifierLink {
  menuItemId: string;
  modifierGroupId: string;
  isRequired: boolean;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DataAccessSource = "rls-supabase-read-boundary" | "supabase-unavailable";

export interface DataAccessEvidence {
  source: DataAccessSource;
  boundary: string;
  rlsScoped: boolean;
  remotePersistence: boolean;
  productionGuardrail: string;
  tenantScope?: `merchant:${string}`;
  reason?: string;
}

export interface StorefrontMerchant {
  id: string;
  slug: string;
  name: string;
  storeId: string;
  storeName: string;
  city: string;
  prepBufferMinutes: number;
  tagline: string;
  notice: string;
}

export interface FulfillmentOrder {
  publicRef: string;
  customer: string;
  total: string;
  status: string;
  nextAction: string;
  tenantScope: `merchant:${string}`;
  paymentMode: string;
  deliveryMode: string;
}

export interface MerchantProfile {
  displayName: string;
  storeName: string;
  kitchenPrepBufferMinutes: number;
  city: string;
  defaultVehicleType: string;
  fragileOverride: string;
  publicOrderingEnabled: boolean;
  supportPhone: string;
}

export interface CatalogDraft extends MenuItemSnapshot {
  sku: string;
  category: string;
  sortOrder: number;
  displayPrice: string;
  tenantSafeMutation: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function money(cents: number): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
  }).format(cents / 100);
}

function nextActionFromStatus(status: string): string {
  const map: Record<string, string> = {
    new: "Accept order",
    accepted: "Start preparing",
    preparing: "Mark ready for pickup",
    ready_for_pickup: "Awaiting driver pickup",
    out_for_delivery: "Track delivery",
    delivered: "Completed",
    cancelled: "Cancelled",
  };
  return map[status] ?? status;
}

function readEvidence(
  runtime: "browser" | "server",
  tenantScope?: `merchant:${string}`,
): DataAccessEvidence {
  const config = getSupabaseBoundaryConfig(runtime);
  const isConfigured = config.mode === "configured";
  return {
    source: isConfigured
      ? "rls-supabase-read-boundary"
      : "supabase-unavailable",
    boundary: `${runtime}-supabase-read`,
    rlsScoped: isConfigured,
    remotePersistence: isConfigured,
    productionGuardrail: isConfigured
      ? "Supabase RLS-scoped read boundary. Reads are served from the remote Supabase instance with RLS enforcement."
      : "Supabase RLS-scoped read boundary. Write persistence is tracked separately per operation.",
    ...(tenantScope ? { tenantScope } : {}),
    ...(config.reason ? { reason: config.reason } : {}),
  };
}

function buildStorefrontMerchant(
  merchant: { id: string; slug: string; display_name: string },
  store?: { id: string; name: string; city: string; prep_buffer_minutes: number; description?: string } | null,
): StorefrontMerchant {
  return {
    id: merchant.id,
    slug: merchant.slug,
    name: merchant.display_name,
    storeId: store?.id ?? "",
    storeName: store?.name ?? "",
    city: store?.city ?? "",
    prepBufferMinutes: store?.prep_buffer_minutes ?? 20,
    tagline: store?.description ?? "",
    notice:
      "Taukei storefront. Orders are processed through our platform.",
  };
}

// ---------------------------------------------------------------------------
// Public storefront
// ---------------------------------------------------------------------------

export async function getPublicStorefrontBySlug(slug: string): Promise<{
  evidence: DataAccessEvidence;
  merchant: StorefrontMerchant | null;
  catalog: MenuItemSnapshot[];
  categories: MenuCategory[];
  modifierGroups: ModifierGroup[];
  modifiers: Modifier[];
  itemModifierLinks: ItemModifierLink[];
}> {
  const evidence = readEvidence("server");
  const client = await createServerSupabaseClient();

  if (!client) {
    return { evidence, merchant: null, catalog: [], categories: [], modifierGroups: [], modifiers: [], itemModifierLinks: [] };
  }

  const { data: merchant, error: merchantErr } = await client
    .from("merchants")
    .select("id, slug, display_name, status")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (merchantErr || !merchant) {
    return { evidence, merchant: null, catalog: [], categories: [], modifierGroups: [], modifiers: [], itemModifierLinks: [] };
  }

  const { data: store } = await client
    .from("stores")
    .select("id, name, city, prep_buffer_minutes, description")
    .eq("merchant_id", merchant.id)
    .eq("public_ordering_enabled", true)
    .eq("status", "open")
    .limit(1)
    .single();

  const { data: items } = await client
    .from("menu_items")
    .select(
      "id, merchant_id, name, description, price_cents, currency, is_available, is_fragile, prep_buffer_minutes, sort_order, category_id, image_url",
    )
    .eq("merchant_id", merchant.id)
    .eq("is_available", true)
    .order("sort_order");

  // Fetch categories for grouping
  const { data: categories } = await client
    .from("menu_categories")
    .select("id, name, sort_order, is_active")
    .eq("merchant_id", merchant.id)
    .eq("is_active", true)
    .order("sort_order");

  // Fetch modifier groups for the storefront
  const { data: modifierGroups } = await client
    .from("modifier_groups")
    .select("id, name, description, min_selections, max_selections, is_active")
    .eq("merchant_id", merchant.id)
    .eq("is_active", true);

  const { data: modifiers } = await client
    .from("modifiers")
    .select("id, modifier_group_id, name, price_delta_cents, is_default, is_available")
    .eq("merchant_id", merchant.id)
    .eq("is_available", true);

  const { data: menuItemModifierGroups } = await client
    .from("menu_item_modifier_groups")
    .select("menu_item_id, modifier_group_id, is_required")
    .eq("merchant_id", merchant.id);

  const catalog: MenuItemSnapshot[] = (items ?? []).map((item) => ({
    id: item.id,
    merchantId: item.merchant_id,
    name: item.name,
    priceCents: item.price_cents,
    currency: (item.currency as MenuItemSnapshot["currency"]) ?? "MYR",
    isAvailable: item.is_available,
    isFragile: item.is_fragile,
    prepBufferMinutes: item.prep_buffer_minutes ?? 0,
    imageUrl: item.image_url ?? undefined,
    categoryId: item.category_id ?? undefined,
    description: item.description ?? undefined,
  }));

  // Map categories
  const mappedCategories: MenuCategory[] = (categories ?? []).map((cat) => ({
    id: cat.id,
    name: cat.name,
    sortOrder: cat.sort_order,
  }));

  // Map modifier groups
  const mappedModifierGroups: ModifierGroup[] = (modifierGroups ?? []).map((mg) => ({
    id: mg.id,
    name: mg.name,
    description: mg.description,
    minSelections: mg.min_selections,
    maxSelections: mg.max_selections,
  }));

  // Map modifiers
  const mappedModifiers: Modifier[] = (modifiers ?? []).map((m) => ({
    id: m.id,
    modifierGroupId: m.modifier_group_id,
    name: m.name,
    priceDeltaCents: m.price_delta_cents,
    isDefault: m.is_default,
    isAvailable: m.is_available,
  }));

  // Map item-modifier links
  const mappedLinks: ItemModifierLink[] = (menuItemModifierGroups ?? []).map((link) => ({
    menuItemId: link.menu_item_id,
    modifierGroupId: link.modifier_group_id,
    isRequired: link.is_required,
  }));

  return {
    evidence,
    merchant: buildStorefrontMerchant(merchant, store),
    catalog,
    categories: mappedCategories,
    modifierGroups: mappedModifierGroups,
    modifiers: mappedModifiers,
    itemModifierLinks: mappedLinks,
  };
}

// ---------------------------------------------------------------------------
// Order tracking
// ---------------------------------------------------------------------------

export async function getOrderTrackingByPublicRef(
  publicRef: string,
): Promise<{
  evidence: DataAccessEvidence;
  merchant: StorefrontMerchant | null;
  order: FulfillmentOrder | null;
}> {
  const evidence = readEvidence("server");
  const client = await createServerSupabaseClient();

  if (!client) {
    return { evidence, merchant: null, order: null };
  }

  const { data: order, error: orderErr } = await client
    .from("orders")
    .select(
      "id, public_ref, status, fulfillment_status, total_cents, currency, merchant_id, customer:customers(name)",
    )
    .eq("public_ref", publicRef)
    .single();

  if (orderErr || !order) {
    return { evidence, merchant: null, order: null };
  }

  const tenantScope: `merchant:${string}` =
    `merchant:${order.merchant_id}`;

  const [{ data: merchant }, { data: paymentSessions }, { data: deliveryJobs }] =
    await Promise.all([
      client
        .from("merchants")
        .select("id, slug, display_name")
        .eq("id", order.merchant_id)
        .single(),
      client
        .from("payment_sessions")
        .select("provider, mode")
        .eq("order_id", order.id)
        .limit(1),
      client
        .from("delivery_jobs")
        .select("provider, mode")
        .eq("order_id", order.id)
        .limit(1),
    ]);

  const paymentSession = paymentSessions?.[0];
  const deliveryJob = deliveryJobs?.[0];

  return {
    evidence: readEvidence("server", tenantScope),
    merchant: merchant
      ? buildStorefrontMerchant(merchant)
      : null,
    order: {
      publicRef: order.public_ref,
      customer: (order.customer as unknown as { name?: string } | null)?.name ?? "Unknown",
      total: money(order.total_cents),
      status: order.fulfillment_status,
      nextAction: nextActionFromStatus(order.fulfillment_status),
      tenantScope,
      paymentMode: paymentSession?.provider ?? "unknown",
      deliveryMode: deliveryJob?.provider ?? "unknown",
    },
  };
}

// ---------------------------------------------------------------------------
// Merchant operations
// ---------------------------------------------------------------------------

export async function getMerchantOperationsContext(
  session: MerchantSession,
): Promise<
  | {
      ok: false;
      evidence: DataAccessEvidence;
      guard: ReturnType<typeof assertMerchantTenantScope>;
      profile: null;
      catalog: [];
      fulfillment: [];
    }
  | {
      ok: true;
      evidence: DataAccessEvidence;
      guard: ReturnType<typeof assertMerchantTenantScope>;
      profile: MerchantProfile;
      catalog: CatalogDraft[];
      fulfillment: FulfillmentOrder[];
    }
> {
  const guard = assertMerchantTenantScope(session, session.merchantId);
  const evidence = readEvidence("server", session.tenantScope);

  if (!guard.ok) {
    return {
      ok: false as const,
      evidence,
      guard,
      profile: null,
      catalog: [],
      fulfillment: [],
    };
  }

  const client = await createServerSupabaseClient();
  if (!client) {
    return {
      ok: false as const,
      evidence: { ...evidence, reason: "Supabase server client unavailable" },
      guard: { ...guard, ok: false, reason: "Supabase server client unavailable" },
      profile: null,
      catalog: [],
      fulfillment: [],
    };
  }

  const merchantId = session.merchantId;

  const [
    { data: merchant },
    { data: store },
    { data: items },
    { data: orders },
  ] = await Promise.all([
    client
      .from("merchants")
      .select("id, display_name")
      .eq("id", merchantId)
      .single(),
    client
      .from("stores")
      .select(
        "id, name, city, prep_buffer_minutes, default_vehicle_type, public_ordering_enabled, phone",
      )
      .eq("merchant_id", merchantId)
      .limit(1)
      .single(),
    client
      .from("menu_items")
      .select(
        "id, merchant_id, sku, name, price_cents, currency, is_available, is_fragile, prep_buffer_minutes, sort_order",
      )
      .eq("merchant_id", merchantId)
      .order("sort_order"),
    client
      .from("orders")
      .select(
        "id, public_ref, status, fulfillment_status, total_cents, currency, merchant_id, customer:customers(name)",
      )
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const hasFragileItems = (items ?? []).some(
    (item: { is_fragile?: boolean }) => item.is_fragile,
  );

  const profile: MerchantProfile = {
    displayName: merchant?.display_name ?? "",
    storeName: store?.name ?? "",
    kitchenPrepBufferMinutes: store?.prep_buffer_minutes ?? 20,
    city: store?.city ?? "",
    defaultVehicleType: store?.default_vehicle_type ?? "MOTORCYCLE",
    fragileOverride: hasFragileItems
      ? "CAR"
      : (store?.default_vehicle_type ?? "MOTORCYCLE"),
    publicOrderingEnabled: store?.public_ordering_enabled ?? false,
    supportPhone: store?.phone ?? "",
  };

  const catalog: CatalogDraft[] = (items ?? []).map((item) => ({
    id: item.id,
    merchantId: item.merchant_id,
    name: item.name,
    priceCents: item.price_cents,
    currency: (item.currency as MenuItemSnapshot["currency"]) ?? "MYR",
    isAvailable: item.is_available,
    isFragile: item.is_fragile,
    prepBufferMinutes: item.prep_buffer_minutes ?? 0,
    sku: item.sku ?? "",
    category: "", // resolved via separate category join if needed
    sortOrder: item.sort_order,
    displayPrice: money(item.price_cents),
    tenantSafeMutation: `update menu_items set name = '${item.name.replace(/'/g, "''")}' where id = '${item.id}' and merchant_id = '${merchantId}'`,
  }));

  const fulfillment: FulfillmentOrder[] = await Promise.all(
    (orders ?? []).map(async (order) => {
      const tenantScope: `merchant:${string}` =
        `merchant:${order.merchant_id}`;

      const [{ data: paymentSessions }, { data: deliveryJobs }] =
        await Promise.all([
          client
            .from("payment_sessions")
            .select("provider")
            .eq("order_id", order.id)
            .limit(1),
          client
            .from("delivery_jobs")
            .select("provider")
            .eq("order_id", order.id)
            .limit(1),
        ]);

      return {
        publicRef: order.public_ref,
        customer:
          (order.customer as unknown as { name?: string } | null)?.name ??
          "Unknown",
        total: money(order.total_cents),
        status: order.fulfillment_status,
        nextAction: nextActionFromStatus(order.fulfillment_status),
        tenantScope,
        paymentMode: paymentSessions?.[0]?.provider ?? "unknown",
        deliveryMode: deliveryJobs?.[0]?.provider ?? "unknown",
      };
    }),
  );

  return {
    ok: true as const,
    evidence,
    guard,
    profile,
    catalog,
    fulfillment,
  };
}
