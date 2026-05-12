import { type NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/src/lib/supabase/route";

export async function updateSupabaseSession(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createSupabaseRouteClient(request, response);

  if (supabase) {
    await supabase.auth.getClaims();
  }

  return response;
}
