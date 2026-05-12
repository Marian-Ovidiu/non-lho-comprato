import type { NextRequest, NextResponse } from "next/server";
import type { CookieMethodsServer } from "@supabase/ssr";

import { createSupabaseRequestClient } from "@/src/lib/supabase/server";

export function createSupabaseRouteClient(
  request: NextRequest,
  response: NextResponse,
) {
  return createSupabaseRequestClient({
    getAll: () => request.cookies.getAll(),
    setAll: ((cookiesToSet) => {
      for (const cookie of cookiesToSet) {
        response.cookies.set(cookie.name, cookie.value, cookie.options);
      }
    }) satisfies CookieMethodsServer["setAll"],
  });
}
