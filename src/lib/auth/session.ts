import { prisma } from "@/src/lib/prisma";
import {
  ensureAppUserForAuthUser,
  getAccessibleWorkspacesForUserId,
  resolveWorkspaceForAuthenticatedUser,
} from "@/src/lib/auth/provisioning";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { cookies } from "next/headers";
import { cache } from "react";
import {
  WORKSPACE_SELECTION_COOKIE,
  getWorkspaceSelectionCookieOptions,
} from "@/src/lib/workspace-selection";
import {
  isWorkspaceDebugEnabled,
  logWorkspaceDebug,
} from "@/src/lib/workspace-debug";

const LEGACY_CURRENT_USER_ID = "legacy-marian";
const LEGACY_CURRENT_WORKSPACE_ID = "legacy-marian-martina";
const shouldLogPerformance = process.env.NODE_ENV !== "production";

function logPerformance(label: string, startedAt: number) {
  if (!shouldLogPerformance) {
    return;
  }

  console.info(`[perf] ${label} ${Math.round(performance.now() - startedAt)}ms`);
}

export type AuthenticatedUser = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
};

export type AuthenticatedWorkspace = {
  id: string;
  name: string;
  kind: "private" | "shared";
  ownerUserId: string;
};

const getSupabaseUser = cache(async () => {
  const startedAt = performance.now();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    logPerformance("auth/supabase-user-unavailable", startedAt);
    return null;
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    logPerformance(
      error ? "auth/supabase-get-user-error" : "auth/supabase-get-user-empty",
      startedAt,
    );
    return null;
  }

  const user = data.user;
  logPerformance("auth/supabase-get-user", startedAt);

  return {
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
  } satisfies AuthenticatedUser;
});

export function isLegacyFallbackEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_LEGACY_FALLBACK?.trim().toLowerCase() === "true"
  );
}

const ensureAuthenticatedUser = cache(async (authenticatedUser: AuthenticatedUser) => {
  return ensureAppUserForAuthUser(authenticatedUser);
});

async function getSelectedWorkspaceId() {
  const cookieStore = await cookies();
  return cookieStore.get(WORKSPACE_SELECTION_COOKIE)?.value ?? null;
}

export const getAuthenticatedUser = cache(async (): Promise<AuthenticatedUser | null> => {
  return getSupabaseUser();
});

export const requireAuth = cache(async (): Promise<AuthenticatedUser> => {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
});

export const getCurrentUser = cache(async () => {
  const startedAt = performance.now();
  const authenticatedUser = await getAuthenticatedUser();

  if (authenticatedUser) {
    const user = await ensureAuthenticatedUser(authenticatedUser);
    logPerformance("auth/current-user", startedAt);
    return user;
  }

  if (!isLegacyFallbackEnabled()) {
    throw new Error("Unauthorized: legacy fallback is disabled");
  }

  const legacyUser = await prisma.user.findUnique({
    where: { id: LEGACY_CURRENT_USER_ID },
  });

  if (!legacyUser) {
    throw new Error("Current user not found");
  }

  logPerformance("auth/current-user-legacy", startedAt);
  return legacyUser;
});

export const getCurrentWorkspace = cache(async () => {
  const startedAt = performance.now();
  const authenticatedUser = await getAuthenticatedUser();

  if (authenticatedUser) {
    const selectedWorkspaceId = await getSelectedWorkspaceId();
    const { workspace, resolutionPath } = await resolveWorkspaceForAuthenticatedUser(
      authenticatedUser,
      selectedWorkspaceId,
    );

    if (
      selectedWorkspaceId &&
      workspace.id !== selectedWorkspaceId &&
      (resolutionPath === "cookie:fallback-empty-to-production" ||
        resolutionPath.startsWith("cookie:ignored-not-member"))
    ) {
      try {
        const cookieStore = await cookies();
        cookieStore.set(
          WORKSPACE_SELECTION_COOKIE,
          workspace.id,
          getWorkspaceSelectionCookieOptions(),
        );
      } catch (cookieError) {
        if (isWorkspaceDebugEnabled()) {
          logWorkspaceDebug("getCurrentWorkspace.cookieSyncFailed", {
            message:
              cookieError instanceof Error ? cookieError.message : String(cookieError),
          });
        }
      }
    }

    if (isWorkspaceDebugEnabled()) {
      logWorkspaceDebug("getCurrentWorkspace", {
        authenticatedUserId: authenticatedUser.id,
        authenticatedUserEmail: authenticatedUser.email,
        selectedWorkspaceId,
        resolvedWorkspaceId: workspace.id,
        resolvedWorkspaceName: workspace.name,
        resolvedWorkspaceKind: workspace.kind,
        resolutionPath,
      });
    }

    logPerformance("auth/current-workspace-resolved", startedAt);
    return workspace;
  }

  if (!isLegacyFallbackEnabled()) {
    throw new Error("Unauthorized: legacy fallback is disabled");
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: LEGACY_CURRENT_WORKSPACE_ID },
  });

  if (!workspace) {
    throw new Error("Current workspace not found");
  }

  const user = await getCurrentUser();
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId: user.id,
      workspaceId: workspace.id,
    },
  });

  if (!membership) {
    throw new Error("Current user is not a member of the active workspace");
  }

  logPerformance("auth/current-workspace-legacy", startedAt);
  return workspace;
});

export const requireWorkspace = cache(async () => {
  return getCurrentWorkspace();
});

export const getCurrentWorkspaceId = cache(async (): Promise<string> => {
  const workspace = await getCurrentWorkspace();
  return workspace.id;
});

export const getAccessibleWorkspacesForCurrentUser = cache(async () => {
  const authenticatedUser = await getAuthenticatedUser();

  if (!authenticatedUser) {
    return [];
  }

  const user = await ensureAuthenticatedUser(authenticatedUser);
  return getAccessibleWorkspacesForUserId(user.id);
});
