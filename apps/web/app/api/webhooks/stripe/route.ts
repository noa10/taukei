import { NextRequest, NextResponse } from "next/server";
import { processStripeWebhook } from "../../../../lib/webhooks/stripe";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = await request.text();
    const signature = request.headers.get("stripe-signature");

    const result = await processStripeWebhook(payload, signature);

    if (!result.accepted || result.status === "rejected") {
      return NextResponse.json(
        { success: false, error: result.reason },
        { status: 400 },
      );
    }

    // For processed events, update the database
    if (result.status === "processed" && result.orderId) {
      const client = await createServerSupabaseClient();
      if (client) {
        // Insert webhook event for idempotency
        const { error: insertErr } = await client
          .from("webhook_events")
          .insert({
            provider: "stripe",
            mode: result.mode,
            event_id: result.eventId,
            event_type: result.eventType ?? "",
            idempotency_key: result.idempotencyKey,
            status: "processed",
            payload: JSON.parse(payload),
            merchant_id: result.merchantId ?? null,
          });

        // Unique violation = duplicate, acknowledge
        if (insertErr && insertErr.code === "23505") {
          return NextResponse.json({ success: true, duplicate: true });
        }

        if (insertErr) {
          console.error("[Stripe Webhook] DB insert failed:", insertErr);
        }

        // Update order status
        if (result.orderStatus) {
          const updateData: Record<string, unknown> = {
            status: result.orderStatus,
          };
          if (result.fulfillmentStatus) {
            updateData.fulfillment_status = result.fulfillmentStatus;
          }

          const { error: updateErr } = await client
            .from("orders")
            .update(updateData)
            .eq("public_ref", result.orderId);

          if (updateErr) {
            console.error("[Stripe Webhook] Order update failed:", updateErr);
          }

          // Insert fulfillment event
          if (result.fulfillmentStatus) {
            await client.from("fulfillment_events").insert({
              merchant_id: result.merchantId ?? "",
              order_id: result.orderId,
              to_status: result.fulfillmentStatus,
              note: `Stripe webhook: ${result.eventType}`,
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Stripe Webhook] Error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
