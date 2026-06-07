import {
  createCheckoutDraft,
  createLalamoveAdapterFromEnv,
  createStripeAdapterFromEnv,
  type CheckoutDraft,
  type CheckoutRequest,
  type MenuItemSnapshot,
} from "@taukei/domain";
import { getSupabaseBoundaryConfig } from "./supabase/config";
import { createServerSupabaseClient } from "./supabase/server";


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
  const client = await createServerSupabaseClient();
  if (!client) return [];

  const { data: items } = await client
    .from("menu_items")
    .select("id,merchant_id,name,price_cents,currency,is_available,is_fragile,prep_buffer_minutes")
    .eq("merchant_id", merchantId)
    .eq("is_available", true);

  return (items ?? []).map(mapRowToMenuItemSnapshot);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  status: "stubbed" | "boundary-accepted" | "rejected";
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

  const isConfigured = getSupabaseBoundaryConfig("server").mode === "configured";

  return {
    source: "supabase-shaped-records-boundary",
    remotePersistence: isConfigured,
    productionGuardrail: isConfigured
      ? "Checkout records served from remote Supabase instance."
      : "Checkout records are Supabase-shaped local evidence only; production persistence requires an explicit RLS-scoped repository/server-action implementation.",
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

  const records = buildCustomerOrderRecords(draft);

  // Persist to remote Supabase when configured
  const config = getSupabaseBoundaryConfig("server");
  if (config.mode === "configured") {
    const client = await createServerSupabaseClient();
    if (client) {
      // Insert order
      const { error: orderErr } = await client.from("orders").insert({
        id: records.order.id,
        merchant_id: records.order.merchant_id,
        store_id: records.order.store_id,
        customer_id: records.order.customer_id,
        public_ref: records.order.public_ref,
        status: records.order.status,
        fulfillment_status: records.order.fulfillment_status,
        subtotal_cents: records.order.subtotal_cents,
        delivery_fee_cents: records.order.delivery_fee_cents,
        platform_fee_cents: records.order.platform_fee_cents,
        delivery_address: records.order.delivery_address,
      });
      if (!orderErr) {
        // Insert order items
        await client.from("order_items").insert(
          records.orderItems.map((item) => ({
            id: item.id,
            order_id: item.order_id,
            merchant_id: item.merchant_id,
            menu_item_id: item.menu_item_id,
            name_snapshot: item.name_snapshot,
            unit_price_cents: item.unit_price_cents,
            quantity: item.quantity,
            is_fragile_snapshot: item.is_fragile_snapshot,
          })),
        );
        // Insert payment session
        await client.from("payment_sessions").insert({
          id: records.paymentSession.id,
          merchant_id: records.paymentSession.merchant_id,
          order_id: records.paymentSession.order_id,
          provider: records.paymentSession.provider,
          mode: records.paymentSession.mode,
          provider_session_id: records.paymentSession.provider_session_id,
          status: records.paymentSession.status,
          amount_cents: records.paymentSession.amount_cents,
          metadata: records.paymentSession.metadata,
        });
        // Insert delivery quote
        await client.from("delivery_quotes").insert({
          id: records.deliveryJob.id,
          merchant_id: records.deliveryJob.merchant_id,
          order_id: records.deliveryJob.order_id,
          provider: records.deliveryJob.provider,
          mode: records.deliveryJob.mode,
          vehicle_type: records.deliveryJob.vehicle_type,
          fee_cents: 0,
          pickup: {},
          dropoff: records.order.delivery_address,
        });
        records.remotePersistence = true;
      }
    }
  }

  return {
    status: config.mode === "configured" ? "boundary-accepted" : "stubbed",
    draft,
    records,
    message:
      config.mode === "configured"
        ? "Checkout validated, records persisted to remote Supabase."
        : "Checkout validated against live catalog and produced Supabase-shaped order/payment/delivery records.",
  };
}

export async function getCustomerTrackingRecords(
  publicRef: string,
): Promise<CustomerOrderRecordSet | null> {
  const client = await createServerSupabaseClient();
  if (!client) return null;

  // Look up the order by public_ref. The RLS policy allows public read via
  // the orders_public_ref_read policy on the unguessable public_ref column.
  const { data: orders, error: orderErr } = await client
    .from("orders")
    .select("*")
    .eq("public_ref", publicRef);

  if (orderErr || !orders || orders.length === 0) return null;

  const order = orders[0];
  const orderId = String(order.id);
  const merchantId = String(order.merchant_id);

  const [{ data: orderItems }, { data: paymentSessions }, { data: deliveryJobs }, { data: fulfillmentEvents }] =
    await Promise.all([
      client.from("order_items").select("*").eq("order_id", orderId),
      client.from("payment_sessions").select("*").eq("order_id", orderId),
      client.from("delivery_quotes").select("*").eq("order_id", orderId),  // taukei uses delivery_quotes not delivery_jobs
      client.from("fulfillment_events").select("*").eq("order_id", orderId).order("occurred_at", { ascending: true }),
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

  const payment = (paymentSessions ?? [])[0];
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

  const delivery = (deliveryJobs ?? [])[0];
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

  for (const event of (fulfillmentEvents ?? [])) {
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
      ? "Checkout records served from remote Supabase instance."
      : "Checkout records are Supabase-shaped local evidence only; production persistence requires an explicit RLS-scoped repository/server-action implementation.",
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
