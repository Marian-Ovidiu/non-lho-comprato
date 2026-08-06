import { headers } from "next/headers";

import { prisma } from "@/src/lib/prisma";
import {
  describeAppBaseUrlProblem,
  resolveAppBaseUrl,
} from "@/src/lib/workspace-invite-policy";

export {
  OPEN_INVITE_MAX_USES,
  OPEN_INVITE_SENTINEL,
  WORKSPACE_INVITE_TTL_DAYS,
  describeAppBaseUrlProblem,
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
    const problem = describeAppBaseUrlProblem({
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      nodeEnv: process.env.NODE_ENV,
    });
    if (problem) {
      console.error(`[invite] ${problem}`);
    }
    return null;
  }

  return new URL(pathname, baseUrl).toString();
}

/// Restituisce il motivo per cui il link non è costruibile, così le action
/// possono dirlo a chi sta invitando invece di un generico "riprova".
export async function getInviteLinkConfigProblem() {
  return describeAppBaseUrlProblem({
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    nodeEnv: process.env.NODE_ENV,
  });
}

export async function isWorkspaceMember(workspaceId: string, userId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
    select: { id: true },
  });

  return membership != null;
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
