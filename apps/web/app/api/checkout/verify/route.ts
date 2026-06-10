import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  const orderRef = req.nextUrl.searchParams.get("order_ref");

  if (!sessionId && !orderRef) {
    return NextResponse.json(
      { success: false, error: "Missing session_id or order_ref" },
      { status: 400 },
    );
  }

  const client = await createServerSupabaseClient();
  if (!client) {
    return NextResponse.json(
      { success: false, error: "Database not configured" },
      { status: 500 },
    );
  }

  // Find order by stripe_session_id or public_ref
  let query = client.from("orders").select("id, public_ref, status, fulfillment_status, total_cents, merchant_id");

  if (sessionId) {
    query = query.eq("stripe_session_id", sessionId);
  } else if (orderRef) {
    query = query.eq("public_ref", orderRef!);
  }

  const { data: orders, error } = await query.limit(1);

  if (error || !orders || orders.length === 0) {
    return NextResponse.json(
      { success: false, error: "Order not found" },
      { status: 404 },
    );
  }

  const order = orders[0]!;

  return NextResponse.json({
    success: true,
    order: {
      id: order.id,
      publicRef: order.public_ref,
      status: order.status,
      fulfillmentStatus: order.fulfillment_status,
      totalCents: order.total_cents,
      merchantId: order.merchant_id,
    },
  });
}
