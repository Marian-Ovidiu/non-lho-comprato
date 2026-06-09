import { type NextRequest, NextResponse } from "next/server";

import { createSupabaseRequestClient } from "@/src/lib/supabase/server";

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

  // The Supabase client refreshes expired tokens during `getUser()`. We must
  // write the refreshed cookies onto BOTH the forwarded request (so the
  // downstream Server Components / Server Actions read the fresh token) and the
  // response (so the browser stores it). See supabase-ssr middleware guidance.
  let response = NextResponse.next({ request });

  const supabase = createSupabaseRequestClient({
    getAll: () => request.cookies.getAll(),
    setAll: (cookiesToSet) => {
      for (const cookie of cookiesToSet) {
        request.cookies.set(cookie.name, cookie.value);
      }

      response = NextResponse.next({ request });

      for (const cookie of cookiesToSet) {
        response.cookies.set(cookie.name, cookie.value, cookie.options);
      }
    },
  });

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
