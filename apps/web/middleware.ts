import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseBoundaryConfig } from "./lib/supabase/config";

// ---------------------------------------------------------------------------
// Taukei middleware
//
// 1. Refreshes the Supabase auth session on every request.
// 2. Protects /merchant/* routes:
//    - No auth → redirect to /login?next=/merchant
//    - Auth but no merchant membership → redirect to /merchant/onboarding
//    - Auth + membership → allow through
// 3. Does NOT touch public routes (storefront, auth pages, API webhooks).
// ---------------------------------------------------------------------------

async function refreshSession(request: NextRequest) {
  const config = getSupabaseBoundaryConfig("server");
  if (config.mode !== "configured" || !config.url) {
    return { supabase: null, response: NextResponse.next() };
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!anonKey) {
    return { supabase: null, response: NextResponse.next() };
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(config.url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request: { headers: request.headers },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getSession();
  return { supabase, response };
}

export async function middleware(request: NextRequest) {
  const { supabase, response } = await refreshSession(request);

  const pathname = request.nextUrl.pathname;

  // Only guard /merchant/* routes (excluding /merchant/login which has its own auth)
  const isMerchantRoute = pathname.startsWith("/merchant");
  const isMerchantLogin = pathname === "/merchant/login";

  if (!isMerchantRoute || isMerchantLogin) {
    return response;
  }

  // If Supabase is not configured, allow through (local dev / demo mode)
  if (!supabase) {
    return response;
  }

  const { data: { user } } = await supabase.auth.getUser();

  // No auth → redirect to merchant login
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/merchant/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated — check for merchant membership
  const { data: membership } = await supabase
    .from("merchant_memberships")
    .select("merchant_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership) {
    // No membership — if they're already going to onboarding, allow through
    if (pathname === "/merchant/onboarding") {
      return response;
    }
    // Otherwise redirect to onboarding to create a merchant
    const onboardingUrl = request.nextUrl.clone();
    onboardingUrl.pathname = "/merchant/onboarding";
    onboardingUrl.searchParams.delete("next");
    return NextResponse.redirect(onboardingUrl);
  }

  // Has membership — set merchant context header and allow through
  response.headers.set("x-taukei-merchant-id", membership.merchant_id as string);
  response.headers.set("x-taukei-merchant-role", membership.role as string);
  response.headers.set("x-taukei-merchant-auth-boundary", "supabase-ready");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
