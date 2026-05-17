import { NextResponse, type NextRequest } from "next/server";

import { resolveWorkspaceForAuthenticatedUser } from "@/src/lib/auth/provisioning";
import { createSupabaseRouteClient } from "@/src/lib/supabase/route";
import {
  WORKSPACE_SELECTION_COOKIE,
  getWorkspaceSelectionCookieOptions,
} from "@/src/lib/workspace-selection";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = requestUrl.searchParams.get("next");
  const safeNextPath =
    nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/onboarding";

  if (!code) {
    console.error("[auth] callback missing code");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.redirect(new URL(safeNextPath, request.url));
  const supabase = createSupabaseRouteClient(request, response);

  if (!supabase) {
    console.error("[auth] callback supabase client unavailable");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth] exchangeCodeForSession error", error);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    try {
      const { workspace } = await resolveWorkspaceForAuthenticatedUser({
        id: user.id,
        email: user.email ?? null,
        name:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          null,
        image:
          (user.user_metadata?.avatar_url as string | undefined) ??
          (user.user_metadata?.picture as string | undefined) ??
          null,
      });

      response.cookies.set(
        WORKSPACE_SELECTION_COOKIE,
        workspace.id,
        getWorkspaceSelectionCookieOptions(),
      );
    } catch (provisionError) {
      console.error("[auth] workspace adoption after login failed", provisionError);
    }
  }

  return response;
}
