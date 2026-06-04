import { demoCatalog, demoCheckoutRequest, demoMerchant } from "./demo-data";
import {
  catalogDrafts,
  fulfillmentOrders,
  merchantProfile,
} from "./merchant-data";
import { getSupabaseBoundaryConfig } from "./supabase/config";
import {
  assertMerchantTenantScope,
  getDemoMerchantSession,
  type MerchantSession,
} from "./supabase/session";

export type DataAccessSource = "stubbed-demo" | "rls-supabase-read-boundary";

export interface DataAccessEvidence {
  source: DataAccessSource;
  boundary: string;
  rlsScoped: boolean;
  remotePersistence: false;
  productionGuardrail: string;
  tenantScope?: `merchant:${string}`;
  reason?: string;
}

function readEvidence(
  runtime: "browser" | "server",
  tenantScope?: `merchant:${string}`,
): DataAccessEvidence {
  const config = getSupabaseBoundaryConfig(runtime);
  return {
    source:
      config.mode === "configured"
        ? "rls-supabase-read-boundary"
        : "stubbed-demo",
    boundary: `${runtime}-supabase-read`,
    rlsScoped: config.mode === "configured",
    remotePersistence: false,
    productionGuardrail:
      "Configured Supabase evidence only proves an RLS-scoped read boundary in this foundation; it is not remote persistence evidence.",
    ...(tenantScope ? { tenantScope } : {}),
    ...(config.reason ? { reason: config.reason } : {}),
  };
}

export async function getPublicStorefrontBySlug(slug: string) {
  const evidence = readEvidence("server");
  if (slug !== demoMerchant.slug) {
    return { evidence, merchant: null, catalog: [] };
  }

  return { evidence, merchant: demoMerchant, catalog: demoCatalog };
}

export async function getDemoCheckoutData() {
  return {
    evidence: readEvidence("server"),
    merchant: demoMerchant,
    checkoutRequest: demoCheckoutRequest,
  };
}

export async function getOrderTrackingByPublicRef(publicRef: string) {
  const order =
    fulfillmentOrders.find((candidate) => candidate.publicRef === publicRef) ??
    null;
  return {
    evidence: readEvidence("server", getDemoMerchantSession().tenantScope),
    merchant: demoMerchant,
    order,
  };
}

export async function getMerchantOperationsContext(
  session: MerchantSession = getDemoMerchantSession(),
) {
  const guard = assertMerchantTenantScope(session, demoMerchant.id);
  const evidence = readEvidence("server", session.tenantScope);

  if (!guard.ok) {
    return {
      ok: false as const,
      evidence,
      guard,
      profile: null,
      catalog: [],
      fulfillment: [],
    };
  }

  return {
    ok: true as const,
    evidence,
    guard,
    profile: merchantProfile,
    catalog: catalogDrafts,
    fulfillment: fulfillmentOrders,
  };
}
