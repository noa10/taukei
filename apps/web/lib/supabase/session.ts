import { stubMerchantSession } from "../merchant-data";

export type MerchantRole = "owner" | "admin" | "staff";
export type MerchantAuthMode = "stubbed-local" | "supabase-rls";

export interface MerchantSession {
  userId: string;
  merchantId: string;
  role: MerchantRole;
  email: string;
  tenantScope: `merchant:${string}`;
  authMode: MerchantAuthMode;
}

export interface TenantGuardResult {
  ok: boolean;
  tenantScope: `merchant:${string}`;
  reason?: string;
}

export function getDemoMerchantSession(): MerchantSession {
  return { ...stubMerchantSession };
}

export function assertMerchantTenantScope(session: MerchantSession, merchantId: string): TenantGuardResult {
  const tenantScope = `merchant:${merchantId}` as const;
  if (session.merchantId !== merchantId) {
    return {
      ok: false,
      tenantScope,
      reason: "Requested merchant does not match the active merchant session tenant scope."
    };
  }

  return { ok: true, tenantScope: session.tenantScope };
}

export function describeMerchantSessionGuard(session: MerchantSession = getDemoMerchantSession()) {
  return {
    authMode: session.authMode,
    tenantScope: session.tenantScope,
    userId: session.userId,
    merchantId: session.merchantId,
    rlsExpectation: session.authMode === "stubbed-local" ? "demo-session-only" : "supabase-auth-rls"
  } as const;
}
