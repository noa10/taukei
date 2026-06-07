export type SupabaseRuntime = "browser" | "server" | "service-role";
export type SupabaseBoundaryMode = "configured" | "stubbed";

export interface SupabaseBoundaryConfig {
  runtime: SupabaseRuntime;
  mode: SupabaseBoundaryMode;
  url?: string;
  hasAnonKey: boolean;
  hasServiceRoleKey: boolean;
  reason?: string;
}

interface SupabaseRawEnv {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  TAUKEI_SITE_URL?: string;
}

function readRawEnv(): SupabaseRawEnv {
  return process.env as SupabaseRawEnv;
}

export function getSupabaseBoundaryConfig(runtime: SupabaseRuntime, raw: SupabaseRawEnv = readRawEnv()): SupabaseBoundaryConfig {
  const url = raw.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = raw.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceRoleKey = raw.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const needsServiceRole = runtime === "service-role";
  const hasRequiredKey = needsServiceRole ? Boolean(serviceRoleKey) : Boolean(anonKey);

  if (!url || !hasRequiredKey) {
    return {
      runtime,
      mode: "stubbed",
      ...(url ? { url } : {}),
      hasAnonKey: Boolean(anonKey),
      hasServiceRoleKey: Boolean(serviceRoleKey),
      reason: needsServiceRole
        ? "SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required before service-role mutations are wired."
        : "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required before Supabase reads are wired."
    };
  }

  return {
    runtime,
    mode: "configured",
    url,
    hasAnonKey: Boolean(anonKey),
    hasServiceRoleKey: Boolean(serviceRoleKey)
  };
}

export function assertSupabaseConfigured(config: SupabaseBoundaryConfig): void {
  if (config.mode === "stubbed") {
    throw new Error(config.reason ?? `Supabase ${config.runtime} boundary is not configured.`);
  }
}

/**
 * Site URL used to build absolute redirect URLs (email verification, password
 * recovery, OAuth callbacks). Taukei honors the public env var first, then
 * the private fallback used by server-only code, and finally defaults to a
 * localhost origin suitable for the bun dev server. The returned URL never
 * ends with a trailing slash.
 */
export function getSiteUrl(raw: SupabaseRawEnv = readRawEnv()): string {
  const candidate = raw.NEXT_PUBLIC_SITE_URL?.trim() || raw.TAUKEI_SITE_URL?.trim();
  const fallback = "http://localhost:56778";
  const url = (candidate && candidate.length > 0 ? candidate : fallback).replace(/\/+$/, "");
  return url;
}

/**
 * Joins the configured site URL with an internal path. The `next` argument
 * MUST be an internal path (validated upstream by `nextPathSchema`); this
 * helper does not escape external URLs and will refuse to construct them.
 */
export function buildSiteUrl(next?: string): string {
  const base = getSiteUrl();
  if (!next) return base;
  if (!next.startsWith("/") || next.startsWith("//")) return base;
  return `${base}${next}`;
}
