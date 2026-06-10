import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { priceCartFromCatalog, type MenuItemSnapshot } from "@taukei/domain";
import { createStripeAdapterFromEnv } from "@taukei/domain/adapters/stripe";
import { createLalamoveAdapterFromEnv } from "@taukei/domain/adapters/lalamove";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import { loadTaukeiEnv } from "@taukei/env";

const CheckoutRequestSchema = z.object({
  merchantId: z.string().min(1),
  storeId: z.string().min(1),
  merchantSlug: z.string().min(1),
  cartLines: z.array(z.object({
    menuItemId: z.string().min(1),
    quantity: z.number().positive().int(),
  })).min(1),
  customer: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().optional(),
  }),
  deliveryAddress: z.object({
    line1: z.string().min(1),
    city: z.string().min(1),
    postcode: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }),
  deliveryQuote: z.object({
    quotationId: z.string(),
    stopIds: z.object({ pickup: z.string(), dropoff: z.string() }),
    feeCents: z.number(),
    serviceType: z.string(),
    expiresAt: z.string(),
  }).optional(),
  platformFeeCents: z.number().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const parsed = CheckoutRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request: " + parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join(", ") },
        { status: 400 },
      );
    }

    const {
      merchantId,
      storeId,
      merchantSlug,
      cartLines,
      customer,
      deliveryAddress,
      deliveryQuote,
      platformFeeCents = 100,
    } = parsed.data;

    const client = await createServerSupabaseClient();
    if (!client) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 },
      );
    }

    // Fetch catalog from DB (server-truth, never trust client prices)
    const { data: items } = await client
      .from("menu_items")
      .select("id, merchant_id, name, price_cents, currency, is_available, is_fragile, prep_buffer_minutes")
      .eq("merchant_id", merchantId)
      .eq("is_available", true);

    const catalog: MenuItemSnapshot[] = (items ?? []).map((item) => ({
      id: item.id,
      merchantId: item.merchant_id,
      name: item.name,
      priceCents: item.price_cents,
      currency: (item.currency as "MYR") ?? "MYR",
      isAvailable: item.is_available,
      isFragile: item.is_fragile,
      prepBufferMinutes: item.prep_buffer_minutes ?? 0,
    }));

    // Validate cart items against catalog
    for (const line of cartLines) {
      const catalogItem = catalog.find((c) => c.id === line.menuItemId);
      if (!catalogItem) {
        return NextResponse.json(
          { success: false, error: `Item ${line.menuItemId} not found or unavailable` },
          { status: 400 },
        );
      }
    }

    // Resolve store for pickup address
    const { data: store } = await client
      .from("stores")
      .select("id, name, phone, address_line1, city, latitude, longitude, merchant_id, prep_buffer_minutes")
      .eq("id", storeId)
      .single();

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Store not found" },
        { status: 404 },
      );
    }

    // Fetch merchant display name
    const { data: merchant } = await client
      .from("merchants")
      .select("display_name")
      .eq("id", merchantId)
      .single();

    const merchantName = merchant?.display_name ?? merchantSlug;

    // Price cart from server-trusted catalog
    const pickupAddress = {
      line1: store.address_line1 || `${store.name}, ${store.city}`,
      city: store.city,
      latitude: store.latitude ?? undefined,
      longitude: store.longitude ?? undefined,
      storeName: store.name,
      storePhone: store.phone ?? "",
    };

    // Get delivery quote if not provided (or use the pre-fetched one)
    let deliveryFeeCents = 500; // fallback flat fee
    let quoteData = deliveryQuote;

    if (store.latitude && store.longitude && deliveryAddress.latitude && deliveryAddress.longitude) {
      if (!quoteData) {
        // Fetch live quote
        try {
          const lalamove = createLalamoveAdapterFromEnv();
          const quote = await lalamove.quoteDelivery({
            merchantId,
            storeId,
            orderRef: `pre-${Date.now()}`,
            pickup: pickupAddress,
            dropoff: {
              ...deliveryAddress,
              recipientName: customer.name,
              recipientPhone: customer.phone,
            },
            lines: priceCartFromCatalog(cartLines, catalog).lines,
          });
          deliveryFeeCents = quote.feeCents;
          quoteData = {
            quotationId: String(quote.metadata.quotationId ?? ""),
            stopIds: {
              pickup: String(quote.metadata.stopIdPickup ?? ""),
              dropoff: String(quote.metadata.stopIdDropoff ?? ""),
            },
            feeCents: quote.feeCents,
            serviceType: String(quote.metadata.serviceType ?? "MOTORCYCLE"),
            expiresAt: String(quote.metadata.expiresAt ?? ""),
          };
        } catch {
          // Fall back to flat fee if live quote fails
          console.warn("[Checkout] Live quote failed, using fallback fee");
        }
      } else {
        deliveryFeeCents = quoteData.feeCents;
      }
    }

    const pricing = priceCartFromCatalog(cartLines, catalog, {
      deliveryFeeCents,
      platformFeeCents,
    });

    // Generate order ref
    const orderRef = `TK-${Date.now().toString(36).toUpperCase()}`;
    const publicRef = orderRef;
    const orderId = crypto.randomUUID();

    // Create order
    const { error: orderErr } = await client.from("orders").insert({
      id: orderId,
      merchant_id: merchantId,
      store_id: storeId,
      public_ref: publicRef,
      status: "pending_payment",
      fulfillment_status: "new",
      subtotal_cents: pricing.totals.subtotalCents,
      delivery_fee_cents: pricing.totals.deliveryFeeCents,
      platform_fee_cents: pricing.totals.platformFeeCents,
      total_cents: pricing.totals.totalCents,
      currency: "MYR",
      delivery_address: deliveryAddress,
    });

    if (orderErr) {
      console.error("[Checkout] Order insert failed:", orderErr);
      return NextResponse.json(
        { success: false, error: "Failed to create order" },
        { status: 500 },
      );
    }

    // Create order items
    const orderItems = pricing.lines.map((line) => ({
      id: crypto.randomUUID(),
      order_id: orderId,
      merchant_id: merchantId,
      menu_item_id: line.menuItemId,
      name_snapshot: line.nameSnapshot,
      unit_price_cents: line.unitPriceCents,
      quantity: line.quantity,
      line_total_cents: line.lineTotalCents,
      is_fragile_snapshot: line.isFragileSnapshot,
    }));

    await client.from("order_items").insert(orderItems);

    // Create delivery quote record
    if (quoteData) {
      await client.from("delivery_quotes").insert({
        id: crypto.randomUUID(),
        merchant_id: merchantId,
        order_id: orderId,
        provider: "lalamove",
        mode: "sandbox",
        vehicle_type: pricing.lines.some((l) => l.isFragileSnapshot) ? "CAR" : "MOTORCYCLE",
        fee_cents: deliveryFeeCents,
        currency: "MYR",
        pickup: pickupAddress,
        dropoff: deliveryAddress,
        quotation_id: quoteData.quotationId,
        stop_ids: quoteData.stopIds,
        expires_at: quoteData.expiresAt || null,
        metadata: { serviceType: quoteData.serviceType },
      });
    }

    // Create delivery job record (pending until payment confirmed)
    const dispatchAt = new Date(
      Date.now() + Math.max(0, (store.prep_buffer_minutes ?? 20) - 6) * 60_000,
    );

    await client.from("delivery_jobs").insert({
      id: crypto.randomUUID(),
      merchant_id: merchantId,
      order_id: orderId,
      provider: "lalamove",
      mode: "sandbox",
      status: "scheduled",
      vehicle_type: pricing.lines.some((l) => l.isFragileSnapshot) ? "CAR" : "MOTORCYCLE",
      scheduled_dispatch_at: dispatchAt.toISOString(),
      metadata: {
        quotationId: quoteData?.quotationId ?? "",
        orderRef: publicRef,
      },
    });

    // Create Stripe Checkout Session
    const env = loadTaukeiEnv();
    const siteUrl = env.siteUrl;

    const stripe = createStripeAdapterFromEnv();
    const session = await stripe.createCheckoutSession({
      merchantId,
      orderRef: publicRef,
      amountCents: pricing.totals.totalCents,
      currency: "MYR",
      platformFeeCents: pricing.totals.platformFeeCents,
      successUrl: `${siteUrl}/order/${publicRef}?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${siteUrl}/${merchantSlug}/checkout`,
      merchantName,
      customerEmail: customer.email,
    });

    // Update order with Stripe session ID
    await client
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", orderId);

    // Create payment session record
    await client.from("payment_sessions").insert({
      id: crypto.randomUUID(),
      merchant_id: merchantId,
      order_id: orderId,
      provider: session.provider,
      mode: session.mode,
      provider_session_id: session.id,
      status: "requires_payment",
      amount_cents: pricing.totals.totalCents,
      currency: "MYR",
      metadata: { orderRef: publicRef },
    });

    return NextResponse.json(
      {
        success: true,
        checkoutUrl: session.checkoutUrl,
        sessionId: session.id,
        orderRef: publicRef,
      },
      { status: 200 },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[API] /api/checkout/create:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to process checkout. Please try again.",
      },
      { status: 500 },
    );
  }
}
