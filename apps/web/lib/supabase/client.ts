import { createBrowserClient as createSsrBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBoundaryConfig, type SupabaseBoundaryConfig } from "./config";

export interface BrowserSupabaseBoundary {
  kind: "browser-supabase-boundary";
  config: SupabaseBoundaryConfig;
  canReadPublicStorefront: boolean;
}

export function getBrowserSupabaseBoundary(): BrowserSupabaseBoundary {
  const config = getSupabaseBoundaryConfig("browser");
  return {
    kind: "browser-supabase-boundary",
    config,
    canReadPublicStorefront: config.mode === "configured"
  };
}

/**
 * Returns a configured Supabase browser client when the boundary is
 * configured (NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY are
 * present). When the boundary is stubbed, returns `null` so callers can
 * degrade gracefully — the public storefront data layer already handles
 * `null` returns as a no-live-side-effect boundary.
 *
 * The created client is cookie-based: @supabase/ssr stores session tokens
 * in document.cookie so the Next.js middleware can refresh them on every
 * navigation.
 */
export function createBrowserSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseBoundaryConfig("browser");
  if (config.mode !== "configured" || !config.url) return null;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!anonKey) return null;
  return createSsrBrowserClient(config.url, anonKey);
}
