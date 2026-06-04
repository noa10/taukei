import { getSupabaseBoundaryConfig, type SupabaseBoundaryConfig } from "./config";

export interface ServerSupabaseBoundary {
  kind: "server-supabase-boundary";
  config: SupabaseBoundaryConfig;
  authRequiredForMerchantMutations: true;
}

export function getServerSupabaseBoundary(): ServerSupabaseBoundary {
  return {
    kind: "server-supabase-boundary",
    config: getSupabaseBoundaryConfig("server"),
    authRequiredForMerchantMutations: true
  };
}
