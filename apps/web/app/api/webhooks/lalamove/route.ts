import { NextRequest, NextResponse } from "next/server";
import { processLalamoveWebhook } from "../../../../lib/webhooks/lalamove";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ success: true }, { status: 200 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = await request.text();
    const signature =
      request.headers.get("x-lalamove-signature") ??
      request.headers.get("lalamove-signature");
    const requestPath = new URL(request.url).pathname;

    const result = await processLalamoveWebhook(
      payload,
      signature,
      requestPath,
    );

    if (!result.accepted || result.status === "rejected") {
      return NextResponse.json(
        { success: false, error: result.reason },
        { status: result.reason.includes("signature") ? 401 : 400 },
      );
    }

    // For processed events, update the database
    if (result.status === "processed" && result.lalamoveOrderId) {
      const client = await createServerSupabaseClient();
      if (client) {
        // Insert webhook event for idempotency
        const { error: insertErr } = await client
          .from("webhook_events")
          .insert({
            provider: "lalamove",
            mode: result.mode,
            event_id: result.eventId,
            event_type: result.eventType ?? "",
            idempotency_key: result.idempotencyKey,
            status: "processed",
            payload: JSON.parse(payload),
          });

        // Unique violation = duplicate
        if (insertErr && insertErr.code === "23505") {
          return NextResponse.json({ success: true, duplicate: true });
        }

        // Update delivery job status
        if (result.deliveryStatus && result.lalamoveOrderId) {
          const { data: deliveryJob } = await client
            .from("delivery_jobs")
            .select("id, order_id, merchant_id, status")
            .eq("provider_job_id", result.lalamoveOrderId)
            .limit(1)
            .maybeSingle();

          if (deliveryJob) {
            // Validate transition
            const currentStatus = deliveryJob.status as string;
            const newStatus = result.deliveryStatus;

            // Update delivery job
            await client
              .from("delivery_jobs")
              .update({ status: newStatus })
              .eq("id", deliveryJob.id);

            // Insert delivery event
            await client.from("delivery_events").insert({
              merchant_id: deliveryJob.merchant_id,
              delivery_job_id: deliveryJob.id,
              status: newStatus,
              payload: JSON.parse(payload),
            });

            // Update order fulfillment status if applicable
            if (result.fulfillmentStatus) {
              await client
                .from("orders")
                .update({
                  fulfillment_status: result.fulfillmentStatus,
                })
                .eq("id", deliveryJob.order_id);

              await client.from("fulfillment_events").insert({
                merchant_id: deliveryJob.merchant_id,
                order_id: deliveryJob.order_id,
                to_status: result.fulfillmentStatus,
                note: `Lalamove webhook: ${result.eventType}`,
              });
            }

            // Update driver details if assigned
            if (result.driverId && deliveryJob) {
              // Driver details will be fetched on-demand or from webhook data
              // For now, store driver ID in metadata
              await client
                .from("delivery_jobs")
                .update({
                  metadata: {
                    driverId: result.driverId,
                  },
                })
                .eq("id", deliveryJob.id);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Lalamove Webhook] Error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
