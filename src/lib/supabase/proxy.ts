import { type NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/src/lib/supabase/route";

export async function updateSupabaseSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === "/auth/callback") {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login";

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createSupabaseRouteClient(request, response);

  if (supabase) {
    const { data } = await supabase.auth.getUser();

    if (!data.user && !isPublicRoute) {
      const redirectResponse = NextResponse.redirect(new URL("/login", request.url));

      for (const cookie of response.cookies.getAll()) {
        redirectResponse.cookies.set(cookie);
      }

      return redirectResponse;
    }
  }

  return response;
}
