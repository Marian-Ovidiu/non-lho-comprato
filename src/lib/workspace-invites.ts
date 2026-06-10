import { headers } from "next/headers";

import { prisma } from "@/src/lib/prisma";
import { resolveAppBaseUrl } from "@/src/lib/workspace-invite-policy";

export {
  OPEN_INVITE_MAX_USES,
  OPEN_INVITE_SENTINEL,
  WORKSPACE_INVITE_TTL_DAYS,
  generateInviteToken,
  getInviteExpiresAt,
  getWorkspaceInvitePath,
  getWorkspaceInviteUnavailableMessage,
  hashInviteToken,
  isOpenWorkspaceInvite,
  isValidInviteEmail,
  normalizeInviteEmail,
  resolveAppBaseUrl,
} from "@/src/lib/workspace-invite-policy";

export type WorkspaceInviteWithWorkspace = Awaited<
  ReturnType<typeof getWorkspaceInviteByTokenHash>
>;

export async function getAppBaseUrl() {
  const headerStore = await headers();
  return resolveAppBaseUrl({
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    origin: headerStore.get("origin"),
    forwardedOrigin: headerStore.get("x-forwarded-origin"),
    nodeEnv: process.env.NODE_ENV,
  });
}

export async function buildAbsoluteAppUrl(pathname: string) {
  const baseUrl = await getAppBaseUrl();

  if (!baseUrl) {
    return null;
  }

  return new URL(pathname, baseUrl).toString();
}

export async function getWorkspaceInviteByTokenHash(tokenHash: string) {
  return prisma.workspaceInvite.findUnique({
    where: {
      tokenHash,
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          kind: true,
          ownerUserId: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      acceptedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}
