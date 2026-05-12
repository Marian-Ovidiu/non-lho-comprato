import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseRouteClient } from "@/src/lib/supabase/route";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.redirect(new URL("/onboarding", request.url));
  const supabase = createSupabaseRouteClient(request, response);

  if (supabase) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  return response;
}
