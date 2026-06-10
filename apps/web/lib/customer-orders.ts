import {
  createCheckoutDraft,
  type CheckoutDraft,
  type CheckoutRequest,
  type MenuItemSnapshot,
} from "@taukei/domain";
import { createStripeAdapterFromEnv } from "@taukei/domain/adapters/stripe";
import { createLalamoveAdapterFromEnv } from "@taukei/domain/adapters/lalamove";
import { getSupabaseBoundaryConfig } from "./supabase/config";
import { createServerSupabaseClient } from "./supabase/server";

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function mapRowToMenuItemSnapshot(row: Record<string, unknown>): MenuItemSnapshot {
  return {
    id: String(row.id),
    merchantId: String(row.merchant_id),
    name: String(row.name),
    priceCents: Number(row.price_cents),
    currency: (String(row.currency) as MenuItemSnapshot["currency"]) || "MYR",
    isAvailable: Boolean(row.is_available),
    isFragile: Boolean(row.is_fragile),
    prepBufferMinutes: Number(row.prep_buffer_minutes ?? 20),
  };
}

async function fetchCatalogForMerchant(merchantId: string): Promise<MenuItemSnapshot[]> {
  const client = await createServerSupabaseClient();
  if (!client) return [];
  const { data: items } = await client
    .from("menu_items")
    .select("id,merchant_id,name,price_cents,currency,is_available,is_fragile,prep_buffer_minutes")
    .eq("merchant_id", merchantId)
    .eq("is_available", true);
  return (items ?? []).map(mapRowToMenuItemSnapshot);
}

export interface CustomerOrderRecordSet {
  source: "supabase-shaped-records-boundary";
  remotePersistence: boolean;
  productionGuardrail: string;
  order: {
    id: string;
    merchant_id: string;
    store_id: string;
    customer_id: string;
    public_ref: string;
    status: string;
    fulfillment_status: string;
    subtotal_cents: number;
    delivery_fee_cents: number;
    platform_fee_cents: number;
    total_cents: number;
    delivery_address: CheckoutRequest["deliveryAddress"];
  };
  orderItems: Array<{
    id: string;
    order_id: string;
    merchant_id: string;
    menu_item_id: string;
    name_snapshot: string;
    unit_price_cents: number;
    quantity: number;
    line_total_cents: number;
    is_fragile_snapshot: boolean;
  }>;
  paymentSession: {
    id: string;
    merchant_id: string;
    order_id: string;
    provider: string;
    mode: string;
    provider_session_id: string;
    status: string;
    amount_cents: number;
    metadata: Record<string, unknown>;
  };
  deliveryJob: {
    id: string;
    merchant_id: string;
    order_id: string;
    provider: string;
    mode: string;
    provider_job_id: string;
    status: string;
    vehicle_type: string;
    driver_name: string | null;
    driver_phone: string | null;
    driver_plate: string | null;
    metadata: Record<string, unknown>;
  };
  trackingEvents: Array<{
    label: string;
    status: string;
    source: "checkout" | "payment" | "delivery" | "fulfillment";
    payload: Record<string, unknown>;
  }>;
}

export interface CustomerCheckoutResult {
  status: "boundary-accepted" | "rejected";
  draft?: CheckoutDraft;
  records?: CustomerOrderRecordSet;
  message: string;
}

export function validateTrustedCustomerCheckout(request: CheckoutRequest): string | null {
  if (request.cart.length === 0)
    return "Public checkout requires at least one cart line.";
  if (!request.customer.phone.trim())
    return "Public checkout requires a customer phone for delivery coordination.";
  for (const line of request.cart) {
    const catalogItem = request.catalog.find(
      (item) => item.id === line.menuItemId && item.merchantId === request.merchantId,
    );
    if (!catalogItem || !catalogItem.isAvailable)
      return `Cart item ${line.menuItemId} is unavailable for this merchant.`;
  }
  return null;
}

export async function createCustomerCheckoutRecords(
  request: CheckoutRequest,
): Promise<CustomerCheckoutResult> {
  let catalog = request.catalog;
  if (!catalog || catalog.length === 0) {
    catalog = await fetchCatalogForMerchant(request.merchantId);
  }

  const enrichedRequest: CheckoutRequest = { ...request, catalog };
  const validationError = validateTrustedCustomerCheckout(enrichedRequest);
  if (validationError) return { status: "rejected", message: validationError };

  const config = getSupabaseBoundaryConfig("server");
  if (config.mode !== "configured") {
    return { status: "rejected", message: "Database not configured for checkout." };
  }

  // Resolve store pickup address
  const client = await createServerSupabaseClient();
  if (!client) return { status: "rejected", message: "Database unavailable." };

  const { data: store } = await client
    .from("stores")
    .select("id, name, phone, address_line1, city, latitude, longitude, merchant_id, prep_buffer_minutes")
    .eq("merchant_id", request.merchantId)
    .limit(1)
    .maybeSingle();

  const { data: merchant } = await client
    .from("merchants")
    .select("display_name")
    .eq("id", request.merchantId)
    .maybeSingle();

  const pickupAddress = store
    ? {
        line1: store.address_line1 || `${store.name}, ${store.city}`,
        city: store.city,
        latitude: store.latitude ?? undefined,
        longitude: store.longitude ?? undefined,
        storeName: store.name,
        storePhone: store.phone ?? "",
      }
    : undefined;

  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const draft = await createCheckoutDraft(
    enrichedRequest,
    {
      stripe: createStripeAdapterFromEnv(),
      lalamove: createLalamoveAdapterFromEnv(),
    },
    {
      now: new Date(),
      pickupAddress,
      merchantName: merchant?.display_name ?? request.merchantId,
      customerEmail: request.customer.email,
      successUrl: `${appUrl}/order/success`,
      cancelUrl: `${appUrl}/order/cancelled`,
    },
  );

  return {
    status: "boundary-accepted",
    draft,
    message: "Checkout validated, Stripe session created.",
  };
}

export async function getCustomerTrackingRecords(
  publicRef: string,
): Promise<CustomerOrderRecordSet | null> {
  const client = await createServerSupabaseClient();
  if (!client) return null;

  const { data: orders, error: orderErr } = await client
    .from("orders")
    .select("*")
    .eq("public_ref", publicRef);

  if (orderErr || !orders || orders.length === 0) return null;

  const order = orders[0]!;
  const orderId = String(order.id);
  const merchantId = String(order.merchant_id);

  const [
    { data: orderItems },
    { data: paymentSessions },
    { data: deliveryJobs },
    { data: fulfillmentEvents },
  ] = await Promise.all([
    client.from("order_items").select("*").eq("order_id", orderId),
    client.from("payment_sessions").select("*").eq("order_id", orderId),
    client.from("delivery_jobs").select("*").eq("order_id", orderId),
    client
      .from("fulfillment_events")
      .select("*")
      .eq("order_id", orderId)
      .order("occurred_at", { ascending: true }),
  ]);

  const trackingEvents: CustomerOrderRecordSet["trackingEvents"] = [];

  if (order.status) {
    trackingEvents.push({
      label: "Order placed",
      status: String(order.status),
      source: "checkout",
      payload: { publicRef },
    });
  }

  const payment = (paymentSessions ?? [])[0];
  if (payment) {
    trackingEvents.push({
      label: "Payment processed",
      status: String(payment.status),
      source: "payment",
      payload: { provider: String(payment.provider), mode: String(payment.mode) },
    });
  }

  const delivery = (deliveryJobs ?? [])[0];
  if (delivery) {
    trackingEvents.push({
      label: "Delivery scheduled",
      status: String(delivery.status),
      source: "delivery",
      payload: {
        provider: String(delivery.provider),
        vehicleType: String(delivery.vehicle_type),
        driverName: delivery.driver_name ?? null,
      },
    });
  }

  for (const event of fulfillmentEvents ?? []) {
    trackingEvents.push({
      label: `Fulfillment: ${event.to_status}`,
      status: String(event.to_status),
      source: "fulfillment" as const,
      payload: { merchantId, note: event.note },
    });
  }

  const deliveryAddress: CheckoutRequest["deliveryAddress"] =
    typeof order.delivery_address === "string"
      ? JSON.parse(String(order.delivery_address))
      : (order.delivery_address as CheckoutRequest["deliveryAddress"]);

  const isConfigured = getSupabaseBoundaryConfig("server").mode === "configured";

  return {
    source: "supabase-shaped-records-boundary",
    remotePersistence: isConfigured,
    productionGuardrail: isConfigured
      ? "Live checkout records served from remote Supabase instance."
      : "Supabase-shaped local evidence only.",
    order: {
      id: orderId,
      merchant_id: merchantId,
      store_id: String(order.store_id),
      customer_id: String(order.customer_id ?? ""),
      public_ref: publicRef,
      status: String(order.status),
      fulfillment_status: String(order.fulfillment_status),
      subtotal_cents: Number(order.subtotal_cents),
      delivery_fee_cents: Number(order.delivery_fee_cents),
      platform_fee_cents: Number(order.platform_fee_cents),
      total_cents: Number(order.total_cents),
      delivery_address: deliveryAddress,
    },
    orderItems: (orderItems ?? []).map((item: Record<string, unknown>) => ({
      id: String(item.id),
      order_id: orderId,
      merchant_id: merchantId,
      menu_item_id: String(item.menu_item_id ?? ""),
      name_snapshot: String(item.name_snapshot),
      unit_price_cents: Number(item.unit_price_cents),
      quantity: Number(item.quantity),
      line_total_cents: Number(item.line_total_cents),
      is_fragile_snapshot: Boolean(item.is_fragile_snapshot),
    })),
    paymentSession: payment
      ? {
          id: String(payment.id),
          merchant_id: merchantId,
          order_id: orderId,
          provider: String(payment.provider),
          mode: String(payment.mode),
          provider_session_id: String(payment.provider_session_id ?? ""),
          status: String(payment.status),
          amount_cents: Number(payment.amount_cents),
          metadata: (payment.metadata as Record<string, unknown>) ?? {},
        }
      : {
          id: "",
          merchant_id: merchantId,
          order_id: orderId,
          provider: "lalamove",
          mode: "sandbox",
          provider_session_id: "",
          status: "requires_payment",
          amount_cents: 0,
          metadata: {},
        },
    deliveryJob: delivery
      ? {
          id: String(delivery.id),
          merchant_id: merchantId,
          order_id: orderId,
          provider: String(delivery.provider),
          mode: String(delivery.mode),
          provider_job_id: String(delivery.provider_job_id ?? ""),
          status: String(delivery.status),
          vehicle_type: String(delivery.vehicle_type),
          driver_name: delivery.driver_name ?? null,
          driver_phone: delivery.driver_phone ?? null,
          driver_plate: delivery.driver_plate ?? null,
          metadata: (delivery.metadata as Record<string, unknown>) ?? {},
        }
      : {
          id: "",
          merchant_id: merchantId,
          order_id: orderId,
          provider: "lalamove",
          mode: "sandbox",
          provider_job_id: "",
          status: "scheduled",
          vehicle_type: "MOTORCYCLE",
          driver_name: null,
          driver_phone: null,
          driver_plate: null,
          metadata: {},
        },
    trackingEvents,
  };
}
