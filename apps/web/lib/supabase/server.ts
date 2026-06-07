import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
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

// ---------------------------------------------------------------------------
// User lookups
//
// `getServerSupabaseUser` returns the authenticated user, or `null` if no
// Supabase boundary is configured or no session is present. It does not
// throw — callers decide whether the absence of a user is a redirect or
// an explicit rejection.
//
// `requireServerSupabaseUser` is the throwing variant for server actions
// and route handlers that must short-circuit on unauthenticated requests.
// ---------------------------------------------------------------------------

export interface ServerSupabaseUser {
  id: string;
  email: string | null;
  raw: User;
}

export interface UnauthenticatedReason {
  kind: "boundary-stubbed" | "no-session" | "session-error";
  message: string;
}

export type ServerSupabaseUserResult =
  | { user: ServerSupabaseUser; error?: undefined }
  | { user: null; error: UnauthenticatedReason };

export async function getServerSupabaseUser(): Promise<ServerSupabaseUserResult> {
  const config = getSupabaseBoundaryConfig("server");
  if (config.mode !== "configured") {
    return {
      user: null,
      error: {
        kind: "boundary-stubbed",
        message: config.reason ?? "Supabase server boundary is not configured."
      }
    };
  }
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      user: null,
      error: { kind: "boundary-stubbed", message: "Supabase server client unavailable." }
    };
  }
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return {
      user: null,
      error: { kind: "session-error", message: error.message }
    };
  }
  if (!data.user) {
    return {
      user: null,
      error: { kind: "no-session", message: "No active Supabase session." }
    };
  }
  return {
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
      raw: data.user
    }
  };
}

export class UnauthenticatedError extends Error {
  readonly reason: UnauthenticatedReason;
  constructor(reason: UnauthenticatedReason) {
    super(reason.message);
    this.name = "UnauthenticatedError";
    this.reason = reason;
  }
}

export async function requireServerSupabaseUser(): Promise<ServerSupabaseUser> {
  const result = await getServerSupabaseUser();
  if (!result.user) throw new UnauthenticatedError(result.error);
  return result.user;
}
