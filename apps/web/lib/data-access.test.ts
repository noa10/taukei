import { describe, expect, it } from "bun:test";
import {
  getMerchantOperationsContext,
  getPublicStorefrontBySlug,
} from "./data-access";
import {
  assertWebhookServiceRoleCaller,
  getServiceRoleSupabaseBoundary,
} from "./supabase/service";
import {
  assertMerchantTenantScope,
  getDemoMerchantSession,
} from "./supabase/session";

const demoMerchantId = "00000000-0000-4000-8000-000000000001";

describe("G003 data-access boundaries", () => {
  it("keeps public storefront reads behind one repository helper", async () => {
    const result = await getPublicStorefrontBySlug("mad-krapow-demo");
    expect(result.merchant?.id).toBe(demoMerchantId);
    expect(result.catalog.length).toBeGreaterThan(0);
    expect(result.evidence.boundary).toBe("server-supabase-read");
    expect(result.evidence.remotePersistence).toBe(false);
    expect(result.evidence.productionGuardrail).toContain(
      "not remote persistence evidence",
    );
  });

  it("rejects cross-tenant merchant operations before mutation helpers run", async () => {
    const session = getDemoMerchantSession();
    expect(assertMerchantTenantScope(session, demoMerchantId).ok).toBe(true);
    expect(
      assertMerchantTenantScope(session, "00000000-0000-4000-8000-000000000999")
        .ok,
    ).toBe(false);

    const context = await getMerchantOperationsContext({
      ...session,
      merchantId: "00000000-0000-4000-8000-000000000999",
      tenantScope: "merchant:00000000-0000-4000-8000-000000000999",
    });
    expect(context.ok).toBe(false);
    expect(context.guard.ok).toBe(false);
  });

  it("confines service-role boundaries to webhook callers", () => {
    const stripeBoundary = getServiceRoleSupabaseBoundary("stripe-webhook");
    expect(stripeBoundary.confinedToWebhooks).toBe(true);
    expect(() =>
      assertWebhookServiceRoleCaller(stripeBoundary, "stripe-webhook"),
    ).not.toThrow();
    expect(() =>
      assertWebhookServiceRoleCaller(stripeBoundary, "lalamove-webhook"),
    ).toThrow(/confined/);
  });
});
