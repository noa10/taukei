import { demoCatalog, demoMerchant, money } from "./demo-data";

export const stubMerchantSession = {
  userId: "00000000-0000-4000-8000-00000000a001",
  merchantId: demoMerchant.id,
  role: "owner",
  email: "owner@taukei.local",
  tenantScope: `merchant:${demoMerchant.id}`,
  authMode: "stubbed-local"
} as const;

export const merchantProfile = {
  displayName: demoMerchant.name,
  storeName: demoMerchant.storeName,
  kitchenPrepBufferMinutes: 20,
  city: demoMerchant.city,
  defaultVehicleType: "MOTORCYCLE",
  fragileOverride: "CAR",
  publicOrderingEnabled: true,
  supportPhone: "+60120000000"
} as const;

export const catalogDrafts = demoCatalog.map((item, index) => ({
  ...item,
  sku: item.id.toUpperCase().replaceAll("-", "_"),
  category: item.id === "thai-tea" ? "Drinks" : "Krapow bowls",
  sortOrder: (index + 1) * 10,
  displayPrice: money(item.priceCents),
  tenantSafeMutation: `update menu_items set merchant_id = '${demoMerchant.id}' where id = '${item.id}'`
}));

export const fulfillmentOrders = [
  {
    publicRef: "TK-DEMO-1001",
    customer: "Aina Demo",
    total: money(3100),
    status: "preparing",
    nextAction: "Mark ready for pickup",
    tenantScope: stubMerchantSession.tenantScope,
    paymentMode: "fake_stripe",
    deliveryMode: "fake_lalamove"
  },
  {
    publicRef: "TK-DEMO-1002",
    customer: "Farid Demo",
    total: money(2250),
    status: "new",
    nextAction: "Accept order",
    tenantScope: stubMerchantSession.tenantScope,
    paymentMode: "fake_stripe",
    deliveryMode: "fake_lalamove"
  }
];
