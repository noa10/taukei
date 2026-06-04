import {
  createCheckoutDraft,
  createLalamoveAdapterFromEnv,
  createStripeAdapterFromEnv,
  type CheckoutDraft,
  type CheckoutRequest,
} from "@taukei/domain";
import { demoCatalog, demoCheckoutRequest, demoMerchant } from "./demo-data";
import { getSupabaseBoundaryConfig } from "./supabase/config";

export interface CustomerOrderRecordSet {
  source: "stubbed-demo" | "supabase-shaped-records-boundary";
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

export function buildTrustedCustomerCheckoutRequest(
  request: CheckoutRequest,
): CheckoutRequest {
  return {
    ...request,
    catalog: demoCatalog,
  };
}

export function validateTrustedCustomerCheckout(
  request: CheckoutRequest,
): string | null {
  if (
    request.merchantId !== demoMerchant.id ||
    request.storeId !== demoMerchant.storeId
  )
    return "Public checkout is limited to the requested merchant/store boundary.";
  if (request.cart.length === 0)
    return "Public checkout requires at least one cart line.";
  if (!request.customer.phone.trim())
    return "Public checkout requires a customer phone for delivery coordination.";

  const trustedRequest = buildTrustedCustomerCheckoutRequest(request);
  for (const line of trustedRequest.cart) {
    const catalogItem = trustedRequest.catalog.find(
      (item) =>
        item.id === line.menuItemId &&
        item.merchantId === trustedRequest.merchantId,
    );
    if (!catalogItem || !catalogItem.isAvailable)
      return `Cart item ${line.menuItemId} is unavailable for this merchant.`;
  }

  return null;
}

export function buildCustomerOrderRecords(
  draft: CheckoutDraft,
): CustomerOrderRecordSet {
  const source =
    getSupabaseBoundaryConfig("server").mode === "configured"
      ? "supabase-shaped-records-boundary"
      : "stubbed-demo";
  const orderId = "00000000-0000-4000-8000-000000000601";
  const orderItems = draft.lines.map((line, index) => ({
    id: `00000000-0000-4000-8000-00000000070${index + 1}`,
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
    source,
    remotePersistence: false,
    productionGuardrail:
      "Checkout records are Supabase-shaped local evidence only; production persistence requires an explicit RLS-scoped repository/server-action implementation.",
    order: {
      id: orderId,
      merchant_id: draft.merchantId,
      store_id: draft.storeId,
      customer_id: "00000000-0000-4000-8000-000000000501",
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
      id: "00000000-0000-4000-8000-000000000801",
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
      id: "00000000-0000-4000-8000-000000000902",
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
        payload: { provider: draft.deliveryJob.provider, noLiveBooking: true },
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
  request: CheckoutRequest = demoCheckoutRequest,
): Promise<CustomerCheckoutResult> {
  const validationError = validateTrustedCustomerCheckout(request);
  if (validationError) return { status: "rejected", message: validationError };

  const trustedRequest = buildTrustedCustomerCheckoutRequest(request);
  const draft = await createCheckoutDraft(
    trustedRequest,
    {
      stripe: createStripeAdapterFromEnv(),
      lalamove: createLalamoveAdapterFromEnv(),
    },
    {
      now: new Date("2026-06-04T12:00:00.000Z"),
      orderRefFactory: () => "TK-DEMO-1001",
      successUrl: "http://localhost:3000/order/TK-DEMO-1001",
      cancelUrl: "http://localhost:3000/mad-krapow-demo",
    },
  );

  return {
    status: "stubbed",
    draft,
    records: buildCustomerOrderRecords(draft),
    message:
      "Checkout validated against trusted catalog and produced Supabase-shaped order/payment/delivery records.",
  };
}

export async function getCustomerTrackingRecords(
  publicRef: string,
): Promise<CustomerOrderRecordSet | null> {
  if (publicRef !== "TK-DEMO-1001") return null;
  const result = await createCustomerCheckoutRecords();
  return result.records ?? null;
}
