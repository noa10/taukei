import { createServerSupabaseClient } from "../../../lib/supabase/server";
import { getServerSupabaseUser } from "../../../lib/supabase/server";
import { getMerchantSession } from "../../../lib/supabase/session";
import FulfillmentClient from "./fulfillment-client";
import type { FulfillmentStatus } from "../../../lib/merchant-types";

function money(cents: number): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
  }).format(cents / 100);
}

interface FulfillmentOrderShape {
  publicRef: string;
  merchantId: string;
  customerName: string;
  customerPhone: string;
  items: { name: string; quantity: number; priceCents: number }[];
  totalCents: number;
  status: FulfillmentStatus;
  createdAt: string;
  paymentMethod: string;
  deliveryProvider: string;
  notes?: string;
}

export default async function MerchantFulfillmentPage() {
  const { user } = await getServerSupabaseUser();

  if (!user) {
    return <p className="field-error">Please sign in.</p>;
  }

  const client = await createServerSupabaseClient();
  if (!client) {
    return <p className="field-error">Supabase is not configured.</p>;
  }

  const session = await getMerchantSession(client);
  if (!session) {
    return <p>No merchant membership. <a href="/merchant/onboarding">Set up your merchant →</a></p>;
  }

  const merchantId = session.merchantId;

  // Fetch real orders from Supabase
  const { data: orders } = await client
    .from("orders")
    .select("id, public_ref, fulfillment_status, total_cents, created_at, customer_notes, customer:customers(name, phone)")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false })
    .limit(50);

  // Fetch order items for each order
  const orderIds = (orders ?? []).map((o) => o.id);

  const { data: orderItems } = orderIds.length > 0
    ? await client
        .from("order_items")
        .select("order_id, name_snapshot, unit_price_cents, quantity")
        .in("order_id", orderIds)
    : { data: [] };

  // Fetch payment sessions and delivery jobs
  const { data: paymentSessions } = orderIds.length > 0
    ? await client
        .from("payment_sessions")
        .select("order_id, provider, mode")
        .in("order_id", orderIds)
    : { data: [] };

  const { data: deliveryJobs } = orderIds.length > 0
    ? await client
        .from("delivery_jobs")
        .select("order_id, provider, vehicle_type")
        .in("order_id", orderIds)
    : { data: [] };

  // Build lookup maps
  const itemsByOrder = new Map<string, { name: string; quantity: number; priceCents: number }[]>();
  for (const item of orderItems ?? []) {
    const list = itemsByOrder.get(item.order_id as string) ?? [];
    list.push({
      name: item.name_snapshot as string,
      quantity: item.quantity as number,
      priceCents: item.unit_price_cents as number,
    });
    itemsByOrder.set(item.order_id as string, list);
  }

  const paymentByOrder = new Map<string, string>();
  for (const ps of paymentSessions ?? []) {
    paymentByOrder.set(
      ps.order_id as string,
      `${(ps.provider as string).replace("fake_", "")} (${ps.mode as string})`,
    );
  }

  const deliveryByOrder = new Map<string, string>();
  for (const dj of deliveryJobs ?? []) {
    deliveryByOrder.set(
      dj.order_id as string,
      `${(dj.provider as string).replace("fake_", "")} (${dj.vehicle_type as string})`,
    );
  }

  const mappedOrders: FulfillmentOrderShape[] = (orders ?? []).map((order) => {
    const customer = order.customer as unknown as { name?: string; phone?: string } | null;
    return {
      publicRef: order.public_ref as string,
      merchantId,
      customerName: customer?.name ?? "Unknown",
      customerPhone: customer?.phone ?? "—",
      items: itemsByOrder.get(order.id as string) ?? [],
      totalCents: order.total_cents as number,
      status: order.fulfillment_status as FulfillmentStatus,
      createdAt: order.created_at as string,
      paymentMethod: paymentByOrder.get(order.id as string) ?? "unknown",
      deliveryProvider: deliveryByOrder.get(order.id as string) ?? "unknown",
      notes: (order.customer_notes as string) ?? undefined,
    };
  });

  const newOrders = mappedOrders.filter((o) => o.status === "new");
  const activeOrders = mappedOrders.filter(
    (o) => o.status !== "delivered" && o.status !== "cancelled",
  );
  const totalRevenue = mappedOrders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + o.totalCents, 0);

  return (
    <>
      <h1 className="merchant-page-title">Fulfillment</h1>
      <p className="merchant-page-subtitle">
        Manage order queue, status transitions, and delivery tracking
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div className="merchant-stat-card">
          <div className="merchant-stat-value">{newOrders.length}</div>
          <div className="merchant-stat-label">New Orders</div>
        </div>
        <div className="merchant-stat-card">
          <div className="merchant-stat-value">{activeOrders.length}</div>
          <div className="merchant-stat-label">Active</div>
        </div>
        <div className="merchant-stat-card">
          <div className="merchant-stat-value">{money(totalRevenue)}</div>
          <div className="merchant-stat-label">Revenue</div>
        </div>
      </div>

      <FulfillmentClient initialOrders={mappedOrders} />
    </>
  );
}
