import { type DeliveryQuote } from "@taukei/domain";
import { createLalamoveAdapterFromEnv } from "@taukei/domain/adapters/lalamove";
import { createServerSupabaseClient } from "../supabase/server";

/**
 * Dispatch a Lalamove delivery for an order after Stripe payment confirmation.
 *
 * Reads the delivery_quote and delivery_job rows, builds the Lalamove order
 * with the store as sender and customer as recipient, and places the order.
 */
export async function dispatchDeliveryForOrder(
  orderId: string,
): Promise<{ success: boolean; lalamoveOrderId?: string; error?: string }> {
  const client = await createServerSupabaseClient();
  if (!client) {
    return { success: false, error: "Database not configured" };
  }

  // Fetch order with store info
  const { data: order } = await client
    .from("orders")
    .select("id, merchant_id, store_id, delivery_address, public_ref")
    .eq("id", orderId)
    .single();

  if (!order) {
    return { success: false, error: "Order not found" };
  }

  // Fetch store for pickup info
  const { data: store } = await client
    .from("stores")
    .select("id, name, phone, address_line1, city, latitude, longitude, merchant_id")
    .eq("merchant_id", order.merchant_id)
    .limit(1)
    .single();

  if (!store || !store.latitude || !store.longitude) {
    return {
      success: false,
      error: "Store location not configured for delivery dispatch.",
    };
  }

  // Fetch delivery job
  const { data: deliveryJob } = await client
    .from("delivery_jobs")
    .select("id, metadata, scheduled_dispatch_at, vehicle_type")
    .eq("order_id", orderId)
    .limit(1)
    .maybeSingle();

  if (!deliveryJob) {
    return { success: false, error: "No delivery job found for order." };
  }

  // Fetch delivery quote for quotation ID and stop IDs
  const { data: deliveryQuote } = await client
    .from("delivery_quotes")
    .select("id, quotation_id, stop_ids, fee_cents")
    .eq("order_id", orderId)
    .limit(1)
    .maybeSingle();

  if (!deliveryQuote?.quotation_id || !deliveryQuote?.stop_ids) {
    return {
      success: false,
      error: "No valid Lalamove quotation found for delivery dispatch.",
    };
  }

  const deliveryAddress = order.delivery_address as Record<string, unknown>;

  try {
    const lalamove = createLalamoveAdapterFromEnv();

    // Build a DeliveryQuote-like object from stored data for the adapter
    const quote: DeliveryQuote = {
      id: deliveryQuote.id,
      provider: "lalamove",
      mode: "sandbox",
      vehicleType: (deliveryJob.vehicle_type as "MOTORCYCLE" | "CAR") ?? "MOTORCYCLE",
      feeCents: deliveryQuote.fee_cents,
      currency: "MYR",
      noLiveBooking: false,
      metadata: {
        quotationId: deliveryQuote.quotation_id,
        stopIdPickup: (deliveryQuote.stop_ids as Record<string, string>)?.pickup ?? "",
        stopIdDropoff: (deliveryQuote.stop_ids as Record<string, string>)?.dropoff ?? "",
        orderRef: order.public_ref,
        merchantId: order.merchant_id,
        storeName: store.name,
        storePhone: store.phone ?? "",
        recipientName: String(deliveryAddress.name ?? ""),
        recipientPhone: String(deliveryAddress.phone ?? ""),
      },
    };

    const dispatchAt = deliveryJob.scheduled_dispatch_at
      ? new Date(deliveryJob.scheduled_dispatch_at)
      : new Date();

    const job = await lalamove.scheduleDeliveryJob(quote, dispatchAt);

    // Update delivery job with Lalamove order ID
    await client
      .from("delivery_jobs")
      .update({
        provider_job_id: job.metadata.lalamoveOrderId ?? job.id,
        status: "assigning_driver",
        metadata: {
          ...((deliveryJob.metadata as Record<string, unknown>) ?? {}),
          lalamoveOrderId: job.metadata.lalamoveOrderId ?? job.id,
          shareLink: job.metadata.shareLink ?? "",
        },
      })
      .eq("id", deliveryJob.id);

    // Insert delivery event
    await client.from("delivery_events").insert({
      merchant_id: order.merchant_id,
      delivery_job_id: deliveryJob.id,
      status: "assigning_driver",
      payload: { lalamoveOrderId: job.metadata.lalamoveOrderId ?? job.id },
    });

    return {
      success: true,
      lalamoveOrderId: job.metadata.lalamoveOrderId as string ?? job.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Delivery Dispatch] Failed:", message);
    return { success: false, error: message };
  }
}
