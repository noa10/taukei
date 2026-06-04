import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseBoundaryConfig } from "./lib/supabase/config";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/merchant")) {
    const config = getSupabaseBoundaryConfig("server");
    response.headers.set("x-taukei-merchant-auth-boundary", config.mode === "configured" ? "supabase-ready" : "stubbed-local-demo");
  }

  return response;
}

export const config = {
  matcher: ["/merchant/:path*"]
};
