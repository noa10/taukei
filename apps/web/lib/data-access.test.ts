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
  type MerchantSession,
} from "./supabase/session";

function createTestMerchantSession(
  overrides?: Partial<MerchantSession>,
): MerchantSession {
  return {
    userId: "00000000-0000-4000-8000-000000000000",
    merchantId: "11111111-1111-4111-8111-111111111111",
    role: "owner",
    email: "test@taukei.app",
    tenantScope: "merchant:11111111-1111-4111-8111-111111111111",
    authMode: "supabase-rls",
    ...overrides,
  };
}

describe("G003 data-access boundaries", () => {
  it("keeps public storefront reads behind one repository helper", async () => {
    const result = await getPublicStorefrontBySlug("test-storefront");
    expect(result.merchant).toBeNull();
    expect(result.catalog).toEqual([]);
    expect(result.evidence.boundary).toBe("server-supabase-read");
    expect(result.evidence.remotePersistence).toBe(false);
    expect(result.evidence.productionGuardrail).toContain(
      "RLS-scoped read boundary",
    );
  });

  it("rejects cross-tenant merchant operations before mutation helpers run", async () => {
    const session = createTestMerchantSession();
    expect(
      assertMerchantTenantScope(
        session,
        "11111111-1111-4111-8111-111111111111",
      ).ok,
    ).toBe(true);
    expect(
      assertMerchantTenantScope(session, "99999999-9999-4999-8999-999999999999")
        .ok,
    ).toBe(false);

    const context = await getMerchantOperationsContext({
      ...session,
      merchantId: "99999999-9999-4999-8999-999999999999",
      tenantScope: "merchant:99999999-9999-4999-8999-999999999999",
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
