import { describe, expect, it } from "bun:test";
import type { MerchantSession } from "./supabase/session";
import {
  legalFulfillmentNextStatuses,
  transitionFulfillmentStatus,
  upsertCatalogItem,
  upsertMerchantProfileDefaults,
} from "./merchant-mutations";

const TEST_MERCHANT_ID = "00000000-0000-4000-8000-000000000001";

function createTestSession(
  overrides?: Partial<MerchantSession>,
): MerchantSession {
  return {
    userId: "00000000-0000-4000-8000-000000000010",
    merchantId: TEST_MERCHANT_ID,
    role: "owner",
    email: "merchant@taukei.test",
    tenantScope: `merchant:${TEST_MERCHANT_ID}`,
    authMode: "supabase-rls",
    ...overrides,
  };
}

describe("G004 merchant mutation boundaries", () => {
  it("accepts merchant profile defaults only inside the active tenant", () => {
    const session = createTestSession();
    const accepted = upsertMerchantProfileDefaults(
      {
        merchantId: TEST_MERCHANT_ID,
        storeName: "Mad Krapow KL Kitchen",
        city: "Kuala Lumpur",
        kitchenPrepBufferMinutes: 25,
        defaultVehicleType: "MOTORCYCLE",
        publicOrderingEnabled: true,
      },
      session,
    );
    expect(accepted.status).toBe("stubbed");
    expect(accepted.table).toBe("stores");
    expect(accepted.remotePersistence).toBe(false);
    expect(accepted.productionGuardrail).toContain("local evidence");

    const rejected = upsertMerchantProfileDefaults(
      {
        merchantId: "00000000-0000-4000-8000-000000000999",
        storeName: "Other Store",
        city: "Kuala Lumpur",
        kitchenPrepBufferMinutes: 20,
        defaultVehicleType: "CAR",
        publicOrderingEnabled: true,
      },
      session,
    );
    expect(rejected.status).toBe("rejected");
    expect(rejected.remotePersistence).toBe(false);
  });

  it("guards catalog mutations with tenant and value checks", () => {
    const session = createTestSession();
    expect(
      upsertCatalogItem(
        {
          merchantId: TEST_MERCHANT_ID,
          itemId: "beef-krapow",
          priceCents: 1700,
        },
        session,
      ).status,
    ).toBe("stubbed");
    expect(
      upsertCatalogItem(
        {
          merchantId: TEST_MERCHANT_ID,
          itemId: "beef-krapow",
          priceCents: -1,
        },
        session,
      ).status,
    ).toBe("rejected");
    expect(
      upsertCatalogItem(
        {
          merchantId: "00000000-0000-4000-8000-000000000999",
          itemId: "beef-krapow",
        },
        session,
      ).status,
    ).toBe("rejected");
  });

  it("accepts any fulfillment transition within the active tenant", () => {
    const session = createTestSession();
    expect(legalFulfillmentNextStatuses("new")).toContain("accepted");
    expect(
      transitionFulfillmentStatus(
        {
          merchantId: TEST_MERCHANT_ID,
          publicRef: "TK-DEMO-1002",
          nextStatus: "accepted",
        },
        session,
      ).status,
    ).toBe("stubbed");
    expect(
      transitionFulfillmentStatus(
        {
          merchantId: TEST_MERCHANT_ID,
          publicRef: "TK-DEMO-1002",
          nextStatus: "delivered",
        },
        session,
      ).status,
    ).toBe("stubbed");
  });

  it("records the acting merchant session in fulfillment events", () => {
    const session = createTestSession();
    const result = transitionFulfillmentStatus(
      {
        merchantId: TEST_MERCHANT_ID,
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
