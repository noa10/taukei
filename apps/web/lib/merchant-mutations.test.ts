import { describe, expect, it } from "bun:test";
import { demoMerchant } from "./demo-data";
import {
  legalFulfillmentNextStatuses,
  transitionFulfillmentStatus,
  upsertCatalogItem,
  upsertMerchantProfileDefaults,
} from "./merchant-mutations";
import { getDemoMerchantSession } from "./supabase/session";

describe("G004 merchant mutation boundaries", () => {
  it("accepts merchant profile defaults only inside the active tenant", () => {
    const accepted = upsertMerchantProfileDefaults({
      merchantId: demoMerchant.id,
      storeName: "Mad Krapow KL Kitchen",
      city: "Kuala Lumpur",
      kitchenPrepBufferMinutes: 25,
      defaultVehicleType: "MOTORCYCLE",
      publicOrderingEnabled: true,
    });
    expect(accepted.status).toBe("stubbed");
    expect(accepted.table).toBe("stores");
    expect(accepted.remotePersistence).toBe(false);
    expect(accepted.productionGuardrail).toContain("local evidence");

    const rejected = upsertMerchantProfileDefaults({
      merchantId: "00000000-0000-4000-8000-000000000999",
      storeName: "Other Store",
      city: "Kuala Lumpur",
      kitchenPrepBufferMinutes: 20,
      defaultVehicleType: "CAR",
      publicOrderingEnabled: true,
    });
    expect(rejected.status).toBe("rejected");
    expect(rejected.remotePersistence).toBe(false);
  });

  it("guards catalog mutations with tenant and value checks", () => {
    expect(
      upsertCatalogItem({
        merchantId: demoMerchant.id,
        itemId: "beef-krapow",
        priceCents: 1700,
      }).status,
    ).toBe("stubbed");
    expect(
      upsertCatalogItem({
        merchantId: demoMerchant.id,
        itemId: "beef-krapow",
        priceCents: -1,
      }).status,
    ).toBe("rejected");
    expect(
      upsertCatalogItem({
        merchantId: "00000000-0000-4000-8000-000000000999",
        itemId: "beef-krapow",
      }).status,
    ).toBe("rejected");
  });

  it("allows only legal fulfillment transitions", () => {
    expect(legalFulfillmentNextStatuses("new")).toContain("accepted");
    expect(
      transitionFulfillmentStatus({
        merchantId: demoMerchant.id,
        publicRef: "TK-DEMO-1002",
        nextStatus: "accepted",
      }).status,
    ).toBe("stubbed");
    expect(
      transitionFulfillmentStatus({
        merchantId: demoMerchant.id,
        publicRef: "TK-DEMO-1002",
        nextStatus: "delivered",
      }).status,
    ).toBe("rejected");
  });

  it("records the acting merchant session in fulfillment events", () => {
    const session = getDemoMerchantSession();
    const result = transitionFulfillmentStatus(
      {
        merchantId: demoMerchant.id,
        publicRef: "TK-DEMO-1001",
        nextStatus: "ready_for_pickup",
      },
      session,
    );
    expect(result.status).toBe("stubbed");
    expect(result.payload).toMatchObject({
      actor_user_id: session.userId,
      merchant_id: session.merchantId,
    });
  });
});
