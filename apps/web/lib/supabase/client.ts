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
