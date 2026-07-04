"use server";

import { getActionTranslations } from "@/src/lib/i18n/server";
import type { Translations } from "@/src/lib/i18n";
import { cookies } from "next/headers";

import { prisma } from "@/src/lib/prisma";
import {
  getCurrentUser,
  getCurrentWorkspace,
} from "@/src/lib/workspace-context";
import {
  buildAbsoluteAppUrl,
  generateInviteToken,
  getInviteExpiresAt,
  getWorkspaceInviteUnavailableMessage,
  getWorkspaceInviteByTokenHash,
  getWorkspaceInvitePath,
  hashInviteToken,
  isValidInviteEmail,
  isOpenWorkspaceInvite,
  normalizeInviteEmail,
} from "@/src/lib/workspace-invites";
import {
  requireWorkspaceRole,
  WorkspaceRbacError,
} from "@/src/features/workspaces/rbac";
import {
  WORKSPACE_SELECTION_COOKIE,
  getWorkspaceSelectionCookieOptions,
} from "@/src/lib/workspace-selection";
import { markWorkspaceSelectedForUser } from "@/src/lib/workspace-last-selection";
import {
  checkRateLimit,
  getClientIpFromRequestHeaders,
} from "@/src/lib/rate-limit";
import { revalidatePath } from "next/cache";

type InviteWorkspace = {
  id: string;
  name: string;
  kind: "private" | "shared";
};

type CreateWorkspaceInviteResult = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
  invitePath?: string;
  inviteUrl?: string;
  workspace?: InviteWorkspace;
  createdSharedWorkspace?: boolean;
};

type AcceptWorkspaceInviteResult = {
  success: boolean;
  message: string;
  status?: "accepted" | "already_member";
  errors?: Record<string, string>;
  workspace?: InviteWorkspace;
};

function getText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function tryRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch (error) {
    console.warn(`Failed to revalidate ${path}:`, error);
  }
}

function rateLimitMessage(t: Translations) {
  return t.validation.tooManyAttempts;
}

export async function createWorkspaceInviteAction(
  formData: FormData,
): Promise<CreateWorkspaceInviteResult> {
  const t = await getActionTranslations();
  const invitedEmailRaw = getText(formData, "email");
  const workspaceNameRaw = getText(formData, "workspaceName");
  const errors: Record<string, string> = {};

  if (!invitedEmailRaw) {
    errors.email = t.inviteActions.emailRequired;
  } else if (!isValidInviteEmail(invitedEmailRaw)) {
    errors.email = t.inviteActions.emailInvalid;
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      message: "Controlla i campi evidenziati",
      errors,
    };
  }

  try {
    const clientIp = await getClientIpFromRequestHeaders();
    const currentUser = await getCurrentUser();
    const currentWorkspace = await getCurrentWorkspace();
    const invitedEmail = normalizeInviteEmail(invitedEmailRaw);
    const currentEmail = normalizeInviteEmail(currentUser.email ?? "");

    if (currentWorkspace.kind === "shared") {
      await requireWorkspaceRole(prisma, {
        workspaceId: currentWorkspace.id,
        userId: currentUser.id,
        roles: ["owner"],
      });
    } else if (currentWorkspace.ownerUserId !== currentUser.id) {
      return {
        success: false,
        message: t.inviteActions.ownerOnly,
      };
    }

    if (!currentEmail) {
      return {
        success: false,
        message: "Serve un account con email per invitare una persona.",
      };
    }

    if (invitedEmail === currentEmail) {
      return {
        success: false,
        message: t.inviteActions.cantInviteSelf,
        errors: {
          email: "Usa un altro indirizzo email",
        },
      };
    }

    const userLimit = await checkRateLimit(
      {
        scope: "invite:create:user:day",
        limit: 20,
        windowSeconds: 24 * 60 * 60,
      },
      [currentUser.id],
    );

    if (!userLimit.allowed) {
      return { success: false, message: rateLimitMessage(t) };
    }

    const workspaceLimit = await checkRateLimit(
      {
        scope: "invite:create:workspace:hour",
        limit: 5,
        windowSeconds: 60 * 60,
      },
      [currentWorkspace.id, currentUser.id, clientIp],
    );

    if (!workspaceLimit.allowed) {
      return { success: false, message: rateLimitMessage(t) };
    }

    const emailLimit = await checkRateLimit(
      {
        scope: "invite:create:email:hour",
        limit: 3,
        windowSeconds: 60 * 60,
      },
      [currentWorkspace.id, invitedEmail],
    );

    if (!emailLimit.allowed) {
      return { success: false, message: rateLimitMessage(t) };
    }

    const token = generateInviteToken();
    const tokenHash = hashInviteToken(token);
    const invitePath = getWorkspaceInvitePath(token);
    const inviteUrl = await buildAbsoluteAppUrl(invitePath);

    if (!inviteUrl) {
      return {
        success: false,
        message:
          t.inviteActions.linkBuildFailed,
      };
    }

    const targetWorkspace = await prisma.$transaction(async (tx) => {
      if (currentWorkspace.kind === "shared") {
        await tx.workspaceInvite.create({
          data: {
            tokenHash,
            workspaceId: currentWorkspace.id,
            type: "email",
            invitedEmail,
            role: "member",
            createdByUserId: currentUser.id,
            expiresAt: getInviteExpiresAt(),
            maxUses: 1,
          },
        });

        return currentWorkspace;
      }

      const workspaceName =
        workspaceNameRaw || `${currentWorkspace.name} condiviso`;

      const workspace = await tx.workspace.create({
        data: {
          name: workspaceName,
          kind: "shared",
          ownerUserId: currentUser.id,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: currentUser.id,
          role: "owner",
        },
      });

      await tx.workspaceInvite.create({
        data: {
          tokenHash,
          workspaceId: workspace.id,
          type: "email",
          invitedEmail,
          role: "member",
          createdByUserId: currentUser.id,
          expiresAt: getInviteExpiresAt(),
          maxUses: 1,
        },
      });

      return workspace;
    });

    const cookieStore = await cookies();
    cookieStore.set(
      WORKSPACE_SELECTION_COOKIE,
      targetWorkspace.id,
      getWorkspaceSelectionCookieOptions(),
    );

    tryRevalidatePath("/");
    tryRevalidatePath("/more");

    return {
      success: true,
      message: t.inviteActions.linkReady,
      invitePath,
      inviteUrl,
      workspace: {
        id: targetWorkspace.id,
        name: targetWorkspace.name,
        kind: targetWorkspace.kind,
      },
      createdSharedWorkspace: currentWorkspace.kind === "private",
    };
  } catch (error) {
    if (error instanceof WorkspaceRbacError) {
      return {
        success: false,
        message: t.inviteActions.ownerOnly,
      };
    }

    console.error("Failed to create workspace invite:", error);
    return {
      success: false,
      message: t.inviteActions.createFailed,
    };
  }
}

export async function acceptWorkspaceInviteAction(
  formData: FormData,
): Promise<AcceptWorkspaceInviteResult> {
  const t = await getActionTranslations();
  const token = getText(formData, "token");

  if (!token) {
    return {
      success: false,
      message: t.inviteActions.invalid,
    };
  }

  try {
    const clientIp = await getClientIpFromRequestHeaders();
    const currentUser = await getCurrentUser();
    const tokenHash = hashInviteToken(token);
    const tokenLimit = await checkRateLimit(
      {
        scope: "invite:accept:token:minute",
        limit: 5,
        windowSeconds: 60,
      },
      [tokenHash, clientIp],
    );

    if (!tokenLimit.allowed) {
      return { success: false, message: rateLimitMessage(t) };
    }

    const userLimit = await checkRateLimit(
      {
        scope: "invite:accept:user:minute",
        limit: 10,
        windowSeconds: 60,
      },
      [currentUser.id, clientIp],
    );

    if (!userLimit.allowed) {
      return { success: false, message: rateLimitMessage(t) };
    }

    const invite = await getWorkspaceInviteByTokenHash(tokenHash);

    if (!invite) {
      return {
        success: false,
        message: t.inviteActions.notAvailable,
      };
    }

    if (invite.workspace == null) {
      return {
        success: false,
        message: t.inviteActions.sharedSpaceGone,
      };
    }

    if (invite.revokedAt) {
      return {
        success: false,
        message: t.inviteActions.noLongerAvailable,
      };
    }

    if (invite.expiresAt.getTime() < Date.now()) {
      return {
        success: false,
        message: t.inviteActions.expired,
      };
    }

    const isOpen = isOpenWorkspaceInvite(invite);
    if (!isOpen) {
      const currentEmail = normalizeInviteEmail(currentUser.email ?? "");
      if (!currentEmail) {
        return {
          success: false,
          message: t.inviteActions.emailAccountNeeded,
        };
      }

      if (currentEmail !== invite.invitedEmail) {
        return {
          success: false,
          message: t.inviteActions.openWithInvitedAccount,
        };
      }
    }

    const existingMembership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: invite.workspaceId,
          userId: currentUser.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingMembership) {
      if (!invite.acceptedAt) {
        await prisma.workspaceInvite.update({
          where: {
            id: invite.id,
          },
          data: {
            acceptedAt: new Date(),
            acceptedByUserId: currentUser.id,
          },
        });
      }

      const cookieStore = await cookies();
      await markWorkspaceSelectedForUser(currentUser.id, invite.workspaceId);
      cookieStore.set(
        WORKSPACE_SELECTION_COOKIE,
        invite.workspaceId,
        getWorkspaceSelectionCookieOptions(),
      );

      tryRevalidatePath("/");
      tryRevalidatePath("/more");

      return {
        success: true,
        message: t.inviteActions.alreadyMember,
        status: "already_member",
        workspace: {
          id: invite.workspace.id,
          name: invite.workspace.name,
          kind: invite.workspace.kind,
        },
      };
    }

    const unavailableMessage = getWorkspaceInviteUnavailableMessage(invite);
    if (unavailableMessage) {
      return {
        success: false,
        message: unavailableMessage,
      };
    }

    const acceptedAt = new Date();
    await prisma.$transaction(async (tx) => {
      const claimedInvite = await tx.workspaceInvite.updateMany({
        where: {
          id: invite.id,
          revokedAt: null,
          expiresAt: { gt: acceptedAt },
          usedCount: { lt: invite.maxUses },
        },
        data: {
          usedCount: { increment: 1 },
          lastUsedAt: acceptedAt,
          acceptedAt: isOpen ? invite.acceptedAt : acceptedAt,
          acceptedByUserId: isOpen ? invite.acceptedByUserId : currentUser.id,
        },
      });

      if (claimedInvite.count !== 1) {
        throw new WorkspaceRbacError(
          "forbidden",
          t.inviteActions.noLongerAvailable,
        );
      }

      await tx.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId: currentUser.id,
          role: invite.role,
          lastSelectedAt: acceptedAt,
        },
      });
    });

    const cookieStore = await cookies();
    await markWorkspaceSelectedForUser(currentUser.id, invite.workspaceId);
    cookieStore.set(
      WORKSPACE_SELECTION_COOKIE,
      invite.workspaceId,
      getWorkspaceSelectionCookieOptions(),
    );

    tryRevalidatePath("/");
    tryRevalidatePath("/more");

    return {
      success: true,
      message: t.inviteActions.accepted,
      status: "accepted",
      workspace: {
        id: invite.workspace.id,
        name: invite.workspace.name,
        kind: invite.workspace.kind,
      },
    };
  } catch (error) {
    if (error instanceof WorkspaceRbacError) {
      return {
        success: false,
        message: error.message,
      };
    }

    console.error("Failed to accept workspace invite:", error);
    return {
      success: false,
      message: t.inviteActions.acceptFailed,
    };
  }
}
