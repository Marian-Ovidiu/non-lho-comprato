import { type NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/src/lib/supabase/route";

const shouldLogPerformance = process.env.NODE_ENV !== "production";

function logPerformance(label: string, startedAt: number) {
  if (!shouldLogPerformance) {
    return;
  }

  console.info(`[perf] ${label} ${Math.round(performance.now() - startedAt)}ms`);
}

function isStaticAssetPath(pathname: string) {
  return (
    pathname === "/sw.js" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/icons/") ||
    /^\/workbox-.*\.js$/u.test(pathname) ||
    /^\/icon.*\.png$/u.test(pathname) ||
    /^\/apple-touch-icon.*\.png$/u.test(pathname)
  );
}

export async function updateSupabaseSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const startedAt = performance.now();

  if (isStaticAssetPath(pathname)) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

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
    logPerformance("proxy/supabase-get-user", startedAt);

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
