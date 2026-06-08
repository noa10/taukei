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
// sets the session cookies, then redirects the user based on their
// membership status:
//   - Users with an active merchant_memberships row → /merchant
//   - Users without a membership → /account
//   - Explicit `next` parameter overrides (validated for safety)
// ---------------------------------------------------------------------------

function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  const parsed = nextPathSchema.safeParse(raw);
  if (parsed.success && parsed.data) return parsed.data;
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const explicitNext = safeNext(searchParams.get("next"));

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

  const response = NextResponse.redirect(new URL("/", request.url));

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

  // If an explicit next path was provided (e.g. from a merchant login
  // redirect), honour it over the default smart redirect.
  if (explicitNext) {
    const redirectResponse = NextResponse.redirect(new URL(explicitNext, request.url));
    // Copy session cookies from the exchange response
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  // Smart redirect: check if user has a merchant membership
  const { data: { user } } = await supabase.auth.getUser();
  let redirectPath = "/account";

  if (user) {
    const { data: membership } = await supabase
      .from("merchant_memberships")
      .select("merchant_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (membership) {
      redirectPath = "/merchant";
    }
  }

  // Update the redirect destination
  const redirectUrl = new URL(redirectPath, request.url);
  const finalResponse = NextResponse.redirect(redirectUrl);
  // Copy session cookies from the exchange response
  response.cookies.getAll().forEach((cookie) => {
    finalResponse.cookies.set(cookie.name, cookie.value);
  });
  return finalResponse;
}
