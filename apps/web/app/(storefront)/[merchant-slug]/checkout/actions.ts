"use server";

import { redirect } from "next/navigation";
import type { MenuItemSnapshot } from "@taukei/domain";
import { createCustomerCheckoutRecords } from "../../../../lib/customer-orders";

export interface CheckoutActionInput {
  cartLines: Array<{ menuItemId: string; quantity: number }>;
  catalog: MenuItemSnapshot[];
  merchantId: string;
  storeId: string;
  merchantSlug: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  addressLine1: string;
  addressCity: string;
  addressPostcode: string;
  addressLatitude?: number;
  addressLongitude?: number;
  deliveryQuote?: {
    quotationId: string;
    stopIds: { pickup: string; dropoff: string };
    feeCents: number;
    serviceType: string;
    expiresAt: string;
  };
}

export async function submitCheckout(
  input: CheckoutActionInput,
): Promise<{ ok: boolean; message: string; checkoutUrl?: string }> {
  try {
    const result = await createCustomerCheckoutRecords({
      merchantId: input.merchantId,
      storeId: input.storeId,
      cart: input.cartLines,
      catalog: input.catalog,
      customer: {
        name: input.customerName.trim(),
        phone: input.customerPhone.trim(),
        ...(input.customerEmail.trim()
          ? { email: input.customerEmail.trim() }
          : {}),
      },
      deliveryAddress: {
        line1: input.addressLine1.trim(),
        city: input.addressCity.trim(),
        ...(input.addressPostcode.trim()
          ? { postcode: input.addressPostcode.trim() }
          : {}),
        ...(input.addressLatitude ? { latitude: input.addressLatitude } : {}),
        ...(input.addressLongitude
          ? { longitude: input.addressLongitude }
          : {}),
      },
      platformFeeCents: 100, // RM 1.00
    });

    if (result.status === "rejected") {
      return { ok: false, message: result.message };
    }

    // If the checkout draft has a Stripe redirect URL, return it for client-side redirect
    if (result.draft?.stripeCheckoutUrl) {
      return {
        ok: true,
        message: "Redirecting to payment...",
        checkoutUrl: result.draft.stripeCheckoutUrl,
      };
    }

    // Fallback: redirect to order tracking
    if (result.records) {
      const publicRef = result.records.order.public_ref;
      redirect(`/order/${publicRef}`);
    }

    return {
      ok: false,
      message: "Order could not be created. Please try again.",
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
    };
  }
}
