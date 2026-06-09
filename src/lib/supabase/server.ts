import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnvironment } from "@/src/lib/supabase/config";

function buildClient(cookieAdapter: CookieMethodsServer) {
  const environment = getSupabaseEnvironment();

  if (!environment) {
    return null;
  }

  return createServerClient(environment.url, environment.anonKey, {
    cookies: cookieAdapter,
  });
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return buildClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      try {
        for (const cookie of cookiesToSet) {
          cookieStore.set(cookie.name, cookie.value, cookie.options);
        }
      } catch {
        // Called from a Server Component render, where cookies are read-only.
        // The proxy middleware refreshes the session on navigations, so this is
        // safe to ignore. In Server Actions / Route Handlers the write succeeds
        // and the refreshed token is persisted.
      }
    },
  });
}

export async function createSupabaseMutableClient() {
  const cookieStore = await cookies();

  return buildClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      for (const cookie of cookiesToSet) {
        cookieStore.set(cookie.name, cookie.value, cookie.options);
      }
    },
  });
}

export function createSupabaseRequestClient(
  requestCookies: {
    getAll: () => Array<{ name: string; value: string }>;
    setAll: CookieMethodsServer["setAll"];
  },
) {
  return buildClient(requestCookies);
}
