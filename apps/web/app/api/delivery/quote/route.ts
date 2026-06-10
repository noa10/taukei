import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createLalamoveAdapterFromEnv } from "@taukei/domain/adapters/lalamove";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

const DeliveryQuoteRequestSchema = z.object({
  storeId: z.string().min(1),
  dropoff: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().min(1),
  }),
  serviceType: z.string().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const parsed = DeliveryQuoteRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 },
      );
    }

    const { storeId, dropoff, serviceType } = parsed.data;
    const client = await createServerSupabaseClient();

    if (!client) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 },
      );
    }

    // Resolve store pickup from stores table
    const { data: store, error: storeErr } = await client
      .from("stores")
      .select("id, name, phone, address_line1, city, latitude, longitude, merchant_id, default_vehicle_type")
      .eq("id", storeId)
      .single();

    if (storeErr || !store) {
      return NextResponse.json(
        { success: false, error: "Store not found" },
        { status: 404 },
      );
    }

    if (!store.latitude || !store.longitude) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Store location is not configured. Delivery cannot be calculated.",
          code: "STORE_NOT_CONFIGURED",
        },
        { status: 500 },
      );
    }

    const lalamove = createLalamoveAdapterFromEnv();

    const quote = await lalamove.quoteDelivery({
      merchantId: store.merchant_id,
      storeId: store.id,
      orderRef: `quote-${Date.now()}`,
      pickup: {
        line1: store.address_line1 || `${store.name}, ${store.city}`,
        city: store.city,
        latitude: store.latitude,
        longitude: store.longitude,
        storeName: store.name,
        storePhone: store.phone ?? "",
      },
      dropoff: {
        line1: dropoff.address,
        city: "", // Will be filled by geocoding or customer input
        latitude: dropoff.latitude,
        longitude: dropoff.longitude,
      },
      lines: [], // Quote only, no items needed for fee calculation
    });

    return NextResponse.json(
      {
        success: true,
        quotationId: quote.metadata.quotationId,
        stopIds: {
          pickup: quote.metadata.stopIdPickup,
          dropoff: quote.metadata.stopIdDropoff,
        },
        feeCents: quote.feeCents,
        currency: quote.currency,
        vehicleType: quote.vehicleType,
        serviceType: quote.metadata.serviceType,
        expiresAt: quote.metadata.expiresAt,
      },
      { status: 200 },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const isOutOfZone =
      errorMessage.toLowerCase().includes("zone") ||
      errorMessage.toLowerCase().includes("service area") ||
      errorMessage.toLowerCase().includes("coverage");

    console.error("[API] /api/delivery/quote:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: isOutOfZone
          ? "Delivery address is outside our service area"
          : `Unable to get delivery quote: ${errorMessage}`,
        code: isOutOfZone ? "OUT_OF_ZONE" : "QUOTE_FAILED",
      },
      { status: isOutOfZone ? 422 : 500 },
    );
  }
}
