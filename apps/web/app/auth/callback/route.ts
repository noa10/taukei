import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseBoundaryConfig } from "../../../lib/supabase/config";
import { nextPathSchema } from "../../../lib/supabase/validation";

// ---------------------------------------------------------------------------
// Auth callback route handler
//
// When the user clicks the email confirmation link or returns from the
// Google OAuth consent screen, Supabase redirects here with a `code`
// query parameter. This handler exchanges the code for a session and
// sets the session cookies, then redirects the user to the `next`
// parameter (defaults to /account).
//
// The `next` parameter is validated with nextPathSchema to prevent open
// redirect attacks — only internal paths starting with a single slash
// are accepted.
// ---------------------------------------------------------------------------

function safeNext(raw: string | null): string {
  if (!raw) return "/account";
  const parsed = nextPathSchema.safeParse(raw);
  if (parsed.success && parsed.data) return parsed.data;
  return "/account";
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  // If there is no code, redirect to login — likely a stale link.
  if (!code) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const config = getSupabaseBoundaryConfig("server");
  if (config.mode !== "configured" || !config.url) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!anonKey) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.redirect(new URL(next, request.url));

  const supabase = createServerClient(config.url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // Code exchange failed — redirect to login with an error hint
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "callback");
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
