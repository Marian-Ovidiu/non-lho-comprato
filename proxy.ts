import { type NextRequest } from "next/server";

import { updateSupabaseSession } from "@/src/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    "/",
    "/entries",
    "/entries/:path*",
    "/habits",
    "/habits/:path*",
    "/goals",
    "/goals/:path*",
    "/stats",
    "/stats/:path*",
    "/reports/monthly",
    "/presets",
    "/more",
  ],
};
