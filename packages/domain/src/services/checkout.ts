import type { CheckoutDraft, CheckoutRequest, DeliveryAddress, LalamovePort, StripePort } from "../types";
import { priceCartFromCatalog } from "./pricing";

export interface CheckoutPorts {
  stripe: StripePort;
  lalamove: LalamovePort;
}

export interface CheckoutOptions {
  now?: Date;
  pickupAddress?: DeliveryAddress;
  successUrl?: string;
  cancelUrl?: string;
  orderRefFactory?: () => string;
  merchantName?: string;
  customerEmail?: string;
}

function defaultOrderRef(): string {
  return `TK-${Date.now().toString(36).toUpperCase()}`;
}

export async function createCheckoutDraft(
  request: CheckoutRequest,
  ports: CheckoutPorts,
  options: CheckoutOptions = {},
): Promise<CheckoutDraft> {
  const orderRef = options.orderRefFactory?.() ?? defaultOrderRef();
  const now = options.now ?? new Date();
  const pricingOptions =
    request.platformFeeCents === undefined
      ? {}
      : { platformFeeCents: request.platformFeeCents };
  const initialPricing = priceCartFromCatalog(
    request.cart,
    request.catalog,
    pricingOptions,
  );

  // Build pickup address from options (store data) or fallback
  const pickup: DeliveryAddress = options.pickupAddress ?? {
    line1: "Taukei pickup",
    city: "Kuala Lumpur",
  };

  // Enrich pickup with store name/phone for Lalamove sender
  const enrichedPickup: DeliveryAddress = {
    ...pickup,
    storeName: pickup.storeName ?? options.merchantName ?? "",
    storePhone: pickup.storePhone ?? "",
  };

  // Enrich dropoff with customer name/phone for Lalamove recipient
  const enrichedDropoff: DeliveryAddress = {
    ...request.deliveryAddress,
    recipientName: request.customer.name,
    recipientPhone: request.customer.phone,
  };

  const deliveryQuote = await ports.lalamove.quoteDelivery({
    merchantId: request.merchantId,
    storeId: request.storeId,
    orderRef,
    pickup: enrichedPickup,
    dropoff: enrichedDropoff,
    lines: initialPricing.lines,
  });

  const pricing = priceCartFromCatalog(request.cart, request.catalog, {
    ...pricingOptions,
    deliveryFeeCents: deliveryQuote.feeCents,
  });

  const dispatchAt = new Date(
    now.getTime() +
      Math.max(0, pricing.maxPrepBufferMinutes - 6) * 60_000,
  );

  const deliveryJob = await ports.lalamove.scheduleDeliveryJob(
    deliveryQuote,
    dispatchAt,
  );

  const paymentSession = await ports.stripe.createCheckoutSession({
    merchantId: request.merchantId,
    orderRef,
    amountCents: pricing.totals.totalCents,
    currency: pricing.totals.currency,
    platformFeeCents: pricing.totals.platformFeeCents,
    successUrl: options.successUrl ?? "http://localhost:3000/order/success",
    cancelUrl: options.cancelUrl ?? "http://localhost:3000/order/cancelled",
    merchantName: options.merchantName ?? request.merchantId,
    customerEmail: options.customerEmail ?? request.customer.email,
  });

  return {
    orderRef,
    merchantId: request.merchantId,
    storeId: request.storeId,
    customer: request.customer,
    deliveryAddress: request.deliveryAddress,
    lines: pricing.lines,
    totals: pricing.totals,
    maxPrepBufferMinutes: pricing.maxPrepBufferMinutes,
    paymentSession,
    deliveryQuote,
    deliveryJob,
    stripeCheckoutUrl: paymentSession.checkoutUrl,
  };
}
