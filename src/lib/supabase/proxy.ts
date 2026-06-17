import { type NextRequest, NextResponse } from "next/server";

import {
  E2E_AUTH_COOKIE,
  isE2ETestAuthEnabled,
} from "@/src/lib/auth/e2e-test-auth";
import { createSupabaseRequestClient } from "@/src/lib/supabase/server";
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIpFromHeaders,
  type RateLimitRule,
} from "@/src/lib/rate-limit";

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

function getProxyRateLimitRule(pathname: string): RateLimitRule | null {
  if (pathname === "/auth/callback") {
    return {
      scope: "proxy:auth-callback:ip:minute",
      limit: 30,
      windowSeconds: 60,
    };
  }

  if (pathname === "/api/exports/ai-analysis") {
    return {
      scope: "proxy:export:ip:minute",
      limit: 20,
      windowSeconds: 60,
    };
  }

  if (pathname === "/invite" || pathname.startsWith("/invite/")) {
    return {
      scope: "proxy:invite:ip:minute",
      limit: 60,
      windowSeconds: 60,
    };
  }

  return null;
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

  const proxyRateLimitRule = getProxyRateLimitRule(pathname);
  if (proxyRateLimitRule) {
    const proxyLimit = await checkRateLimit(proxyRateLimitRule, [
      getClientIpFromHeaders(request.headers),
      pathname,
    ]);

    if (!proxyLimit.allowed) {
      return createRateLimitResponse(proxyLimit);
    }
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
    pathname === "/login" ||
    pathname === "/privacy" ||
    pathname === "/delete-account" ||
    pathname === "/account-deleted" ||
    (isE2ETestAuthEnabled() && pathname === "/api/test/auth");

  // The Supabase client refreshes expired tokens during `getUser()`. We must
  // write the refreshed cookies onto BOTH the forwarded request (so the
  // downstream Server Components / Server Actions read the fresh token) and the
  // response (so the browser stores it). See supabase-ssr middleware guidance.
  let response = NextResponse.next({ request });

  if (
    isE2ETestAuthEnabled() &&
    request.cookies.get(E2E_AUTH_COOKIE)?.value.trim()
  ) {
    return response;
  }

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
