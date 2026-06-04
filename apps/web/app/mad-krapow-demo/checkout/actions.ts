"use server";

import type { CheckoutDraft, CheckoutRequest } from "@taukei/domain";
import { createCustomerCheckoutRecords, type CustomerOrderRecordSet } from "../../../lib/customer-orders";
import { getDemoCheckoutData } from "../../../lib/data-access";
import { getServerSupabaseBoundary } from "../../../lib/supabase/server";

export interface CheckoutActionResult {
  status: "stubbed" | "rejected";
  boundary: string;
  unauthenticatedCheckout: true;
  draft?: CheckoutDraft;
  records?: CustomerOrderRecordSet;
  message: string;
}

export async function createDemoCheckoutAction(request?: CheckoutRequest): Promise<CheckoutActionResult> {
  const { checkoutRequest } = await getDemoCheckoutData();
  const safeRequest = request ?? checkoutRequest;
  const boundary = getServerSupabaseBoundary();
  const checkout = await createCustomerCheckoutRecords(safeRequest);

  return {
    status: checkout.status,
    boundary: boundary.kind,
    unauthenticatedCheckout: true,
    draft: checkout.draft,
    records: checkout.records,
    message: checkout.message
  };
}
