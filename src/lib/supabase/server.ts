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
    setAll: () => {
      // Server Components cannot mutate cookies. Proxy/route handlers handle refresh.
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
