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
}

export async function submitCheckout(input: CheckoutActionInput): Promise<{ ok: boolean; message: string }> {
  const result = await createCustomerCheckoutRecords({
    merchantId: input.merchantId,
    storeId: input.storeId,
    cart: input.cartLines,
    catalog: input.catalog,
    customer: {
      name: input.customerName.trim(),
      phone: input.customerPhone.trim(),
      ...(input.customerEmail.trim() ? { email: input.customerEmail.trim() } : {}),
    },
    deliveryAddress: {
      line1: input.addressLine1.trim(),
      city: input.addressCity.trim(),
      ...(input.addressPostcode.trim() ? { postcode: input.addressPostcode.trim() } : {}),
    },
    platformFeeCents: 100, // RM 1.00
  });

  if (result.status === "rejected") {
    return { ok: false, message: result.message };
  }

  if (!result.records) {
    return { ok: false, message: "Order could not be created. Please try again." };
  }

  const publicRef = result.records.order.public_ref;

  // Redirect server-side to the order tracking page
  redirect(`/order/${publicRef}`);
}
