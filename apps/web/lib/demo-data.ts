import type { CheckoutRequest, MenuItemSnapshot } from "@taukei/domain";

export const demoMerchant = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "mad-krapow-demo",
  name: "Mad Krapow Demo",
  storeId: "00000000-0000-4000-8000-000000000101",
  storeName: "Mad Krapow KL Kitchen",
  city: "Kuala Lumpur",
  prepBufferMinutes: 20,
  tagline: "Direct Thai basil bowls, owned by the kitchen — not a marketplace.",
  notice: "Taukei demo storefront. Checkout and delivery are stubbed; no payment capture and no rider booking."
} as const;

export const demoCatalog: MenuItemSnapshot[] = [
  {
    id: "beef-krapow",
    merchantId: demoMerchant.id,
    name: "Signature Basil Beef Pad Kra Pao",
    priceCents: 1650,
    currency: "MYR",
    isAvailable: true,
    isFragile: false,
    prepBufferMinutes: 15
  },
  {
    id: "chicken-krapow",
    merchantId: demoMerchant.id,
    name: "Chicken Krapow Bowl",
    priceCents: 1450,
    currency: "MYR",
    isAvailable: true,
    isFragile: false,
    prepBufferMinutes: 15
  },
  {
    id: "thai-tea",
    merchantId: demoMerchant.id,
    name: "Thai Milk Tea",
    priceCents: 650,
    currency: "MYR",
    isAvailable: true,
    isFragile: true,
    prepBufferMinutes: 5
  }
];

export const demoCheckoutRequest: CheckoutRequest = {
  merchantId: demoMerchant.id,
  storeId: demoMerchant.storeId,
  cart: [
    { menuItemId: "beef-krapow", quantity: 1, clientUnitPriceCents: 1 },
    { menuItemId: "thai-tea", quantity: 1, clientUnitPriceCents: 1 }
  ],
  catalog: demoCatalog,
  customer: {
    name: "Aina Demo",
    phone: "+60123334444",
    email: "aina@example.test"
  },
  deliveryAddress: {
    line1: "Demo Residence, Jalan Ampang",
    city: "Kuala Lumpur",
    postcode: "50000"
  }
};

export function money(cents: number): string {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(cents / 100);
}
