import type { SupabaseClient as RealSupabaseClient } from "@supabase/supabase-js";

export type MerchantRole = "owner" | "admin" | "staff";
export type MerchantAuthMode = "supabase-rls";

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

/**
 * Resolve the merchant session for the currently authenticated user.
 * Uses the real SupabaseClient from @supabase/ssr (returned by createServerSupabaseClient).
 * Returns null if the user is not authenticated or has no active merchant membership.
 */
export async function getMerchantSession(
  supabase: RealSupabaseClient,
): Promise<MerchantSession | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    return null;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("merchant_memberships")
    .select("merchant_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    return null;
  }

  return {
    userId: user.id,
    merchantId: membership.merchant_id as string,
    role: membership.role as MerchantRole,
    email: user.email,
    tenantScope: `merchant:${membership.merchant_id}`,
    authMode: "supabase-rls",
  };
}

export function assertMerchantTenantScope(
  session: MerchantSession,
  merchantId: string,
): TenantGuardResult {
  const tenantScope = `merchant:${merchantId}` as const;
  if (session.merchantId !== merchantId) {
    return {
      ok: false,
      tenantScope,
      reason:
        "Requested merchant does not match the active merchant session tenant scope.",
    };
  }

  return { ok: true, tenantScope: session.tenantScope };
}

export function describeMerchantSessionGuard(session: MerchantSession) {
  return {
    authMode: session.authMode,
    tenantScope: session.tenantScope,
    userId: session.userId,
    merchantId: session.merchantId,
    rlsExpectation: "supabase-auth-rls",
  } as const;
}
