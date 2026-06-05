import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
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

export async function createServerSupabaseClient() {
  const config = getSupabaseBoundaryConfig("server");
  if (config.mode !== "configured" || !config.url) return null;

  const cookieStore = await cookies();
  return createServerClient(
    config.url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
