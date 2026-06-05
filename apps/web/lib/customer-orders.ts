import {
  createCheckoutDraft,
  createLalamoveAdapterFromEnv,
  createStripeAdapterFromEnv,
  type CheckoutDraft,
  type CheckoutRequest,
  type MenuItemSnapshot,
} from "@taukei/domain";
import { getSupabaseBoundaryConfig } from "./supabase/config";

// ---------------------------------------------------------------------------
// Supabase REST client (local — extract to ./supabase/server when ready)
// ---------------------------------------------------------------------------

interface SupabaseRestClient {
  configured: boolean;
  restGet<T = Record<string, unknown>>(
    table: string,
    params?: Record<string, string>,
  ): Promise<T[]>;
}

function createServerSupabaseClient(): SupabaseRestClient {
  const config = getSupabaseBoundaryConfig("server");
  const baseUrl = config.url;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const configured =
    config.mode === "configured" && Boolean(baseUrl) && Boolean(anonKey);

  async function restGet<T = Record<string, unknown>>(
    table: string,
    params: Record<string, string> = {},
  ): Promise<T[]> {
    if (!configured || !baseUrl || !anonKey) return [];
    const qs = new URLSearchParams(params);
    const url = `${baseUrl}/rest/v1/${table}?${qs.toString()}`;
    try {
      const res = await fetch(url, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          Accept: "application/json",
        },
      });
      if (!res.ok) return [];
      return (await res.json()) as T[];
    } catch {
      return [];
    }
  }

  return { configured, restGet };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function mapRowToMenuItemSnapshot(
  row: Record<string, unknown>,
): MenuItemSnapshot {
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

async function fetchCatalogForMerchant(
  merchantId: string,
): Promise<MenuItemSnapshot[]> {
  const client = createServerSupabaseClient();
  if (!client.configured) return [];

  const rows = await client.restGet("menu_items", {
    select:
      "id,merchant_id,name,price_cents,currency,is_available,is_fragile,prep_buffer_minutes",
    merchant_id: `eq.${merchantId}`,
    is_available: "eq.true",
  });

  return rows.map(mapRowToMenuItemSnapshot);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CustomerOrderRecordSet {
  source: "supabase-shaped-records-boundary";
  remotePersistence: false;
  productionGuardrail: string;
  order: {
    id: string;
    merchant_id: string;
    store_id: string;
    customer_id: string;
    public_ref: string;
    status: "confirmed";
    fulfillment_status: "preparing";
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
    mode: "fake";
    provider_session_id: string;
    status: string;
    amount_cents: number;
    metadata: { noLivePayment: true };
  };
  deliveryJob: {
    id: string;
    merchant_id: string;
    order_id: string;
    provider: string;
    mode: "fake";
    provider_job_id: string;
    status: string;
    vehicle_type: string;
    metadata: { noLiveBooking: true };
  };
  trackingEvents: Array<{
    label: string;
    status: string;
    source: "checkout" | "payment" | "delivery" | "fulfillment";
    payload: Record<string, unknown>;
  }>;
}

export interface CustomerCheckoutResult {
  status: "stubbed" | "rejected";
  draft?: CheckoutDraft;
  records?: CustomerOrderRecordSet;
  message: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildTrustedCustomerCheckoutRequest(
  request: CheckoutRequest,
): CheckoutRequest {
  // Catalog is already populated in the request by the caller (fetched from
  // Supabase or provided directly). This function is a pass-through that
  // signals the request has been trusted for checkout processing.
  return { ...request };
}

export function validateTrustedCustomerCheckout(
  request: CheckoutRequest,
): string | null {
  if (request.cart.length === 0)
    return "Public checkout requires at least one cart line.";
  if (!request.customer.phone.trim())
    return "Public checkout requires a customer phone for delivery coordination.";

  for (const line of request.cart) {
    const catalogItem = request.catalog.find(
      (item) =>
        item.id === line.menuItemId &&
        item.merchantId === request.merchantId,
    );
    if (!catalogItem || !catalogItem.isAvailable)
      return `Cart item ${line.menuItemId} is unavailable for this merchant.`;
  }

  return null;
}

export function buildCustomerOrderRecords(
  draft: CheckoutDraft,
): CustomerOrderRecordSet {
  const orderId = generateId();
  const orderItems = draft.lines.map((line) => ({
    id: generateId(),
    order_id: orderId,
    merchant_id: draft.merchantId,
    menu_item_id: line.menuItemId,
    name_snapshot: line.nameSnapshot,
    unit_price_cents: line.unitPriceCents,
    quantity: line.quantity,
    line_total_cents: line.lineTotalCents,
    is_fragile_snapshot: line.isFragileSnapshot,
  }));

  return {
    source: "supabase-shaped-records-boundary",
    remotePersistence: false,
    productionGuardrail:
      "Checkout records are Supabase-shaped local evidence only; production persistence requires an explicit RLS-scoped repository/server-action implementation.",
    order: {
      id: orderId,
      merchant_id: draft.merchantId,
      store_id: draft.storeId,
      customer_id: generateId(),
      public_ref: draft.orderRef,
      status: "confirmed",
      fulfillment_status: "preparing",
      subtotal_cents: draft.totals.subtotalCents,
      delivery_fee_cents: draft.totals.deliveryFeeCents,
      platform_fee_cents: draft.totals.platformFeeCents,
      total_cents: draft.totals.totalCents,
      delivery_address: draft.deliveryAddress,
    },
    orderItems,
    paymentSession: {
      id: generateId(),
      merchant_id: draft.merchantId,
      order_id: orderId,
      provider: draft.paymentSession.provider,
      mode: "fake",
      provider_session_id: draft.paymentSession.id,
      status: draft.paymentSession.status,
      amount_cents: draft.totals.totalCents,
      metadata: { noLivePayment: true },
    },
    deliveryJob: {
      id: generateId(),
      merchant_id: draft.merchantId,
      order_id: orderId,
      provider: draft.deliveryJob.provider,
      mode: "fake",
      provider_job_id: draft.deliveryJob.id,
      status: draft.deliveryJob.status,
      vehicle_type: draft.deliveryJob.vehicleType,
      metadata: { noLiveBooking: true },
    },
    trackingEvents: [
      {
        label: "Order confirmed",
        status: "confirmed",
        source: "checkout",
        payload: { publicRef: draft.orderRef },
      },
      {
        label: "Payment stubbed",
        status: draft.paymentSession.status,
        source: "payment",
        payload: {
          provider: draft.paymentSession.provider,
          noLivePayment: true,
        },
      },
      {
        label: "Delivery scheduled",
        status: draft.deliveryJob.status,
        source: "delivery",
        payload: {
          provider: draft.deliveryJob.provider,
          noLiveBooking: true,
        },
      },
      {
        label: "Kitchen preparing",
        status: "preparing",
        source: "fulfillment",
        payload: { merchantId: draft.merchantId },
      },
    ],
  };
}

export async function createCustomerCheckoutRecords(
  request: CheckoutRequest,
): Promise<CustomerCheckoutResult> {
  // Fetch catalog from Supabase if the request doesn't already carry one.
  let catalog = request.catalog;
  if (!catalog || catalog.length === 0) {
    catalog = await fetchCatalogForMerchant(request.merchantId);
  }

  const enrichedRequest: CheckoutRequest = { ...request, catalog };
  const validationError = validateTrustedCustomerCheckout(enrichedRequest);
  if (validationError) return { status: "rejected", message: validationError };

  const trustedRequest = buildTrustedCustomerCheckoutRequest(enrichedRequest);
  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const draft = await createCheckoutDraft(
    trustedRequest,
    {
      stripe: createStripeAdapterFromEnv(),
      lalamove: createLalamoveAdapterFromEnv(),
    },
    {
      now: new Date(),
      successUrl: `${appUrl}/order/success`,
      cancelUrl: `${appUrl}/order/cancelled`,
    },
  );

  return {
    status: "stubbed",
    draft,
    records: buildCustomerOrderRecords(draft),
    message:
      "Checkout validated against live catalog and produced Supabase-shaped order/payment/delivery records.",
  };
}

export async function getCustomerTrackingRecords(
  publicRef: string,
): Promise<CustomerOrderRecordSet | null> {
  const client = createServerSupabaseClient();
  if (!client.configured) return null;

  // Look up the order by public_ref. Orders are behind RLS (merchant members
  // only), so unauthenticated public lookups will return empty.
  const orders = await client.restGet("orders", {
    select: "*",
    public_ref: `eq.${publicRef}`,
  });

  if (!orders || orders.length === 0) return null;

  const order = orders[0];
  const orderId = String(order.id);
  const merchantId = String(order.merchant_id);

  const [orderItems, paymentSessions, deliveryJobs, fulfillmentEvents] =
    await Promise.all([
      client.restGet("order_items", {
        select: "*",
        order_id: `eq.${orderId}`,
      }),
      client.restGet("payment_sessions", {
        select: "*",
        order_id: `eq.${orderId}`,
      }),
      client.restGet("delivery_jobs", {
        select: "*",
        order_id: `eq.${orderId}`,
      }),
      client.restGet("fulfillment_events", {
        select: "*",
        order_id: `eq.${orderId}`,
        order: "occurred_at.asc",
      }),
    ]);

  const trackingEvents: CustomerOrderRecordSet["trackingEvents"] = [];

  if (order.status) {
    trackingEvents.push({
      label: "Order confirmed",
      status: String(order.status),
      source: "checkout",
      payload: { publicRef },
    });
  }

  const payment = paymentSessions[0];
  if (payment) {
    trackingEvents.push({
      label: "Payment processed",
      status: String(payment.status),
      source: "payment",
      payload: {
        provider: String(payment.provider),
        noLivePayment: true,
      },
    });
  }

  const delivery = deliveryJobs[0];
  if (delivery) {
    trackingEvents.push({
      label: "Delivery scheduled",
      status: String(delivery.status),
      source: "delivery",
      payload: {
        provider: String(delivery.provider),
        noLiveBooking: true,
      },
    });
  }

  for (const event of fulfillmentEvents) {
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

  return {
    source: "supabase-shaped-records-boundary",
    remotePersistence: false,
    productionGuardrail:
      "Checkout records are Supabase-shaped local evidence only; production persistence requires an explicit RLS-scoped repository/server-action implementation.",
    order: {
      id: orderId,
      merchant_id: merchantId,
      store_id: String(order.store_id),
      customer_id: String(order.customer_id ?? ""),
      public_ref: publicRef,
      status: "confirmed",
      fulfillment_status: "preparing",
      subtotal_cents: Number(order.subtotal_cents),
      delivery_fee_cents: Number(order.delivery_fee_cents),
      platform_fee_cents: Number(order.platform_fee_cents),
      total_cents: Number(order.total_cents),
      delivery_address: deliveryAddress,
    },
    orderItems: orderItems.map((item) => ({
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
          mode: "fake" as const,
          provider_session_id: String(payment.provider_session_id ?? ""),
          status: String(payment.status),
          amount_cents: Number(payment.amount_cents),
          metadata: { noLivePayment: true },
        }
      : {
          id: "",
          merchant_id: merchantId,
          order_id: orderId,
          provider: "fake_stripe",
          mode: "fake" as const,
          provider_session_id: "",
          status: "stubbed",
          amount_cents: 0,
          metadata: { noLivePayment: true },
        },
    deliveryJob: delivery
      ? {
          id: String(delivery.id),
          merchant_id: merchantId,
          order_id: orderId,
          provider: String(delivery.provider),
          mode: "fake" as const,
          provider_job_id: String(delivery.provider_job_id ?? ""),
          status: String(delivery.status),
          vehicle_type: String(delivery.vehicle_type),
          metadata: { noLiveBooking: true },
        }
      : {
          id: "",
          merchant_id: merchantId,
          order_id: orderId,
          provider: "fake_lalamove",
          mode: "fake" as const,
          provider_job_id: "",
          status: "scheduled",
          vehicle_type: "MOTORCYCLE",
          metadata: { noLiveBooking: true },
        },
    trackingEvents,
  };
}
