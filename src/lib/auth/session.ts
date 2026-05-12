import { prisma } from "@/src/lib/prisma";
import {
  DEFAULT_LEGACY_PERSON,
  normalizeLegacyPerson,
} from "@/src/lib/ui-person";
import {
  ensureAppUserForAuthUser,
  ensureDefaultWorkspaceForUser,
  ensureLegacyWorkspaceForUser,
  getLegacyAuthMapping,
} from "@/src/lib/auth/provisioning";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

const LEGACY_CURRENT_USER_ID = "legacy-marian";
const LEGACY_CURRENT_WORKSPACE_ID = "legacy-marian-martina";

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

async function getSupabaseUser() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  const user = data.user;

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
}

export function isLegacyFallbackEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_LEGACY_FALLBACK?.trim().toLowerCase() === "true"
  );
}

async function ensureAuthenticatedUser(authenticatedUser: AuthenticatedUser) {
  return ensureAppUserForAuthUser(authenticatedUser);
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  return getSupabaseUser();
}

export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

export async function getCurrentUser() {
  const authenticatedUser = await getAuthenticatedUser();

  if (authenticatedUser) {
    return ensureAuthenticatedUser(authenticatedUser);
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

  return legacyUser;
}

export async function getCurrentWorkspace() {
  const authenticatedUser = await getAuthenticatedUser();

  if (authenticatedUser) {
    const user = await ensureAuthenticatedUser(authenticatedUser);
    const legacyMapping = getLegacyAuthMapping(authenticatedUser.email);

    if (legacyMapping) {
      return ensureLegacyWorkspaceForUser(user.id);
    }

    return ensureDefaultWorkspaceForUser(user);
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

  return workspace;
}

export async function requireWorkspace() {
  return getCurrentWorkspace();
}

export async function getCurrentWorkspaceId(): Promise<string> {
  const workspace = await getCurrentWorkspace();
  return workspace.id;
}

export function getLegacyFallbackPerson(): typeof DEFAULT_LEGACY_PERSON {
  return normalizeLegacyPerson(DEFAULT_LEGACY_PERSON) ?? DEFAULT_LEGACY_PERSON;
}
