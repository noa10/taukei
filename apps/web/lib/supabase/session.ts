// Minimal Supabase client interface — satisfies @supabase/supabase-js when wired in.
// Defined inline to avoid adding @supabase/supabase-js as a dependency prematurely.
interface SupabaseAuthClient {
  getUser(): Promise<{
    data: { user: { id: string; email?: string } | null };
    error: Error | null;
  }>;
}

interface SupabaseQueryBuilder {
  select(columns: string): SupabaseFilterBuilder;
}

interface SupabaseFilterBuilder {
  eq(field: string, value: string): SupabaseFilterBuilder;
  single(): Promise<{
    data: Record<string, unknown> | null;
    error: Error | null;
  }>;
}

export interface SupabaseClient {
  auth: SupabaseAuthClient;
  from(table: string): SupabaseQueryBuilder;
}

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

export async function getMerchantSession(
  supabase: SupabaseClient,
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
    .single();

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
