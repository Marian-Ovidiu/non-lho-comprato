"use server";

import { getActionTranslations } from "@/src/lib/i18n/server";
import type { Translations } from "@/src/lib/i18n";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";

import { prisma } from "@/src/lib/prisma";
import {
  WORKSPACE_SELECTION_COOKIE,
  getWorkspaceSelectionCookieOptions,
} from "@/src/lib/workspace-selection";
import { markWorkspaceSelectedForUser } from "@/src/lib/workspace-last-selection";
import { refreshSupabaseSessionForAction } from "@/src/lib/auth/action-session";
import { logAndRethrowDataLoadError } from "@/src/lib/data-load-error";
import {
  getCurrentWorkspaceId,
  getCurrentWorkspace,
  getCurrentUser,
  getCurrentWorkspaceMembers,
} from "@/src/lib/workspace-context";
import { isSupportedCurrency } from "@/src/lib/workspace-currency";
import { isSupportedLanguage } from "@/src/lib/workspace-language";
import { isSupportedTimezone } from "@/src/lib/workspace-timezone";
import {
  buildAbsoluteAppUrl,
  generateInviteToken,
  getInviteExpiresAt,
  getWorkspaceInviteUnavailableMessage,
  getWorkspaceInvitePath,
  hashInviteToken,
  isOpenWorkspaceInvite,
  OPEN_INVITE_MAX_USES,
  OPEN_INVITE_SENTINEL,
} from "@/src/lib/workspace-invites";
import {
  authorizeWorkspaceMemberRemoval,
  requireWorkspaceRole,
  WorkspaceRbacError,
} from "@/src/features/workspaces/rbac";
import {
  checkRateLimit,
  getClientIpFromRequestHeaders,
} from "@/src/lib/rate-limit";

type CreateWorkspaceResult = {
  success: boolean;
  message: string;
  workspaceId?: string;
};

export async function createWorkspaceAction(
  formData: FormData,
): Promise<CreateWorkspaceResult> {
  const t = await getActionTranslations();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { success: false, message: t.workspaceActions.nameRequired };
  }

  if (name.length > 80) {
    return { success: false, message: t.workspaceActions.nameTooLong };
  }

  try {
    const [user, currentWorkspace] = await Promise.all([
      getCurrentUser(),
      getCurrentWorkspace(),
    ]);

    if (
      currentWorkspace.kind !== "private" ||
      currentWorkspace.ownerUserId !== user.id
    ) {
      return {
        success: false,
        message:
          t.workspaceActions.onlyFromPrivate,
      };
    }

    const workspace = await prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: {
          name,
          kind: "shared",
          ownerUserId: user.id,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: ws.id,
          userId: user.id,
          role: "owner",
          lastSelectedAt: new Date(),
        },
      });

      return ws;
    });

    const cookieStore = await cookies();
    cookieStore.set(
      WORKSPACE_SELECTION_COOKIE,
      workspace.id,
      getWorkspaceSelectionCookieOptions(),
    );

    revalidatePath("/", "layout");

    return { success: true, message: t.workspaceActions.created, workspaceId: workspace.id };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to create workspace:", error);
    return { success: false, message: t.workspaceActions.createFailed };
  }
}

export async function getCurrentWorkspaceMembersAction() {
  await refreshSupabaseSessionForAction();

  try {
    return await getCurrentWorkspaceMembers();
  } catch (error) {
    logAndRethrowDataLoadError("getCurrentWorkspaceMembersAction failed", error);
  }
}

type GenerateOpenInviteResult = {
  success: boolean;
  message: string;
  inviteUrl?: string;
};

function rateLimitMessage(t: Translations) {
  return t.validation.tooManyAttempts;
}

export async function generateOpenInviteAction(): Promise<GenerateOpenInviteResult> {
  const t = await getActionTranslations();
  try {
    const clientIp = await getClientIpFromRequestHeaders();
    const user = await getCurrentUser();
    const workspaceId = await getCurrentWorkspaceId();

    await requireWorkspaceRole(prisma, {
      workspaceId,
      userId: user.id,
      roles: ["owner"],
    });

    const workspace = await prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
      select: { id: true, kind: true },
    });

    if (!workspace) {
      return { success: false, message: t.workspaceActions.noActiveWorkspace };
    }

    const workspaceLimit = await checkRateLimit(
      {
        scope: "invite:open:create:workspace:hour",
        limit: 3,
        windowSeconds: 60 * 60,
      },
      [workspace.id, user.id, clientIp],
    );

    if (!workspaceLimit.allowed) {
      return { success: false, message: rateLimitMessage(t) };
    }

    const token = generateInviteToken();
    const tokenHash = hashInviteToken(token);
    const invitePath = getWorkspaceInvitePath(token);
    const inviteUrl = await buildAbsoluteAppUrl(invitePath);

    if (!inviteUrl) {
      return { success: false, message: t.workspaceActions.linkBuildFailed };
    }

    await prisma.workspaceInvite.create({
      data: {
        tokenHash,
        workspaceId: workspace.id,
        type: "open_link",
        invitedEmail: OPEN_INVITE_SENTINEL,
        role: "member",
        createdByUserId: user.id,
        expiresAt: getInviteExpiresAt(),
        maxUses: OPEN_INVITE_MAX_USES,
      },
    });

    return { success: true, message: "Link generato.", inviteUrl };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof WorkspaceRbacError) {
      return { success: false, message: t.workspaceActions.ownerOnlyInvites };
    }

    console.error("Failed to generate open invite:", error);
    return { success: false, message: t.workspaceActions.linkGenerateFailed };
  }
}

type JoinByLinkResult = {
  success: boolean;
  message: string;
  workspaceName?: string;
};

export async function joinByLinkAction(
  formData: FormData,
): Promise<JoinByLinkResult> {
  const t = await getActionTranslations();
  const raw = String(formData.get("link") ?? "").trim();

  // Extract token from URL or treat the whole string as token
  let token = raw;
  try {
    const url = new URL(raw);
    const parts = url.pathname.split("/").filter(Boolean);
    const inviteIndex = parts.indexOf("invite");
    if (inviteIndex !== -1 && parts[inviteIndex + 1]) {
      token = parts[inviteIndex + 1];
    }
  } catch {
    // not a URL, treat as raw token
  }

  if (!token) {
    return { success: false, message: t.workspaceActions.inviteLinkInvalidInput };
  }

  try {
    const clientIp = await getClientIpFromRequestHeaders();
    const user = await getCurrentUser();
    const tokenHash = hashInviteToken(token);
    const tokenLimit = await checkRateLimit(
      {
        scope: "invite:join:token:minute",
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
        scope: "invite:join:user:minute",
        limit: 10,
        windowSeconds: 60,
      },
      [user.id, clientIp],
    );

    if (!userLimit.allowed) {
      return { success: false, message: rateLimitMessage(t) };
    }

    const invite = await prisma.workspaceInvite.findUnique({
      where: { tokenHash },
      include: { workspace: { select: { id: true, name: true, kind: true } } },
    });

    if (!invite || !invite.workspace) {
      return { success: false, message: t.workspaceActions.linkUnavailable };
    }

    const unavailableMessage = getWorkspaceInviteUnavailableMessage(invite);
    if (unavailableMessage) {
      return { success: false, message: unavailableMessage };
    }

    const isOpen = isOpenWorkspaceInvite(invite);

    if (!isOpen) {
      const userEmail = user.email?.trim().toLowerCase();
      const invitedEmail = invite.invitedEmail.trim().toLowerCase();
      if (!userEmail || userEmail !== invitedEmail) {
        return { success: false, message: t.workspaceActions.linkForAnotherAccount };
      }
    }

    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId: user.id } },
      select: { id: true },
    });

    if (!existing) {
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
            acceptedByUserId: isOpen ? invite.acceptedByUserId : user.id,
          },
        });

        if (claimedInvite.count !== 1) {
          throw new WorkspaceRbacError(
            "forbidden",
            t.workspaceActions.linkUnavailable,
          );
        }

        await tx.workspaceMember.create({
          data: {
            workspaceId: invite.workspaceId,
            userId: user.id,
            role: invite.role,
            lastSelectedAt: new Date(),
          },
        });
      });
    }

    await markWorkspaceSelectedForUser(user.id, invite.workspaceId);

    const cookieStore = await cookies();
    cookieStore.set(
      WORKSPACE_SELECTION_COOKIE,
      invite.workspaceId,
      getWorkspaceSelectionCookieOptions(),
    );

    revalidatePath("/", "layout");

    return { success: true, message: t.workspaceActions.joined, workspaceName: invite.workspace.name };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof WorkspaceRbacError) {
      return { success: false, message: error.message };
    }

    console.error("Failed to join workspace:", error);
    return { success: false, message: t.workspaceActions.joinFailed };
  }
}

export async function switchWorkspaceAction(
  formData: FormData,
): Promise<{ success: boolean }> {
  const workspaceId = String(formData.get("workspaceId") ?? "").trim();

  if (!workspaceId) {
    return { success: false };
  }

  await refreshSupabaseSessionForAction();

  let user: Awaited<ReturnType<typeof getCurrentUser>>;
  try {
    user = await getCurrentUser();
  } catch (error) {
    unstable_rethrow(error);
    console.error("switchWorkspaceAction auth failed:", error);
    return { success: false };
  }
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      OR: [
        { ownerUserId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
    select: { id: true },
  });

  if (!workspace) {
    return { success: false };
  }

  await markWorkspaceSelectedForUser(user.id, workspace.id);

  const cookieStore = await cookies();
  cookieStore.set(
    WORKSPACE_SELECTION_COOKIE,
    workspace.id,
    getWorkspaceSelectionCookieOptions(),
  );

  return { success: true };
}

type RemoveMemberResult = {
  success: boolean;
  message: string;
};

type UpdateCurrencyResult = {
  success: boolean;
  message: string;
};

export async function updateWorkspaceCurrencyAction(
  formData: FormData,
): Promise<UpdateCurrencyResult> {
  const t = await getActionTranslations();
  const code = String(formData.get("currency") ?? "").trim().toUpperCase();

  if (!isSupportedCurrency(code)) {
    return { success: false, message: t.workspaceActions.currencyUnsupported };
  }

  try {
    const workspaceId = await getCurrentWorkspaceId();

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { currency: code },
    });

    revalidatePath("/", "layout");

    return { success: true, message: "Valuta aggiornata." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to update workspace currency:", error);
    return { success: false, message: t.workspaceActions.currencyUpdateFailed };
  }
}

type UpdateLanguageResult = {
  success: boolean;
  message: string;
};

export async function updateWorkspaceLanguageAction(
  formData: FormData,
): Promise<UpdateLanguageResult> {
  const t = await getActionTranslations();
  const code = String(formData.get("language") ?? "").trim().toLowerCase();

  if (!isSupportedLanguage(code)) {
    return { success: false, message: t.workspaceActions.languageUnsupported };
  }

  try {
    const workspaceId = await getCurrentWorkspaceId();

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { language: code },
    });

    revalidatePath("/", "layout");

    return { success: true, message: "Lingua aggiornata." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to update workspace language:", error);
    return { success: false, message: t.workspaceActions.languageUpdateFailed };
  }
}

type UpdateTimezoneResult = {
  success: boolean;
  message: string;
};

export async function updateWorkspaceTimezoneAction(
  formData: FormData,
): Promise<UpdateTimezoneResult> {
  const t = await getActionTranslations();
  const timezone = String(formData.get("timezone") ?? "").trim();

  if (!isSupportedTimezone(timezone)) {
    return { success: false, message: t.workspaceActions.timezoneUnsupported };
  }

  try {
    const workspaceId = await getCurrentWorkspaceId();

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { timezone },
    });

    revalidatePath("/", "layout");

    return { success: true, message: "Fuso orario aggiornato." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to update workspace timezone:", error);
    return { success: false, message: t.workspaceActions.timezoneUpdateFailed };
  }
}

type CompleteSetupResult = {
  success: boolean;
  message: string;
};

export async function completeWorkspaceSetupAction(
  formData: FormData,
): Promise<CompleteSetupResult> {
  const t = await getActionTranslations();
  const timezone = String(formData.get("timezone") ?? "").trim();
  const currency = String(formData.get("currency") ?? "").trim().toUpperCase();
  const language = String(formData.get("language") ?? "").trim().toLowerCase();

  if (!isSupportedTimezone(timezone)) {
    return { success: false, message: t.workspaceActions.timezoneUnsupported };
  }

  if (!isSupportedCurrency(currency)) {
    return { success: false, message: t.workspaceActions.currencyUnsupported };
  }

  if (!isSupportedLanguage(language)) {
    return { success: false, message: t.workspaceActions.languageUnsupported };
  }

  try {
    const workspaceId = await getCurrentWorkspaceId();

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { timezone, currency, language, setupCompleted: true },
    });

    revalidatePath("/", "layout");

    return { success: true, message: "Configurazione completata." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to complete workspace setup:", error);
    return { success: false, message: t.workspaceActions.setupSaveFailed };
  }
}

export async function removeWorkspaceMemberAction(
  targetUserId: string,
): Promise<RemoveMemberResult> {
  const t = await getActionTranslations();
  if (!targetUserId) {
    return { success: false, message: t.workspaceActions.userNotSpecified };
  }

  try {
    const user = await getCurrentUser();
    const workspaceId = await getCurrentWorkspaceId();

    await prisma.$transaction(async (tx) => {
      await authorizeWorkspaceMemberRemoval(tx, {
        workspaceId,
        actorUserId: user.id,
        targetUserId,
      });

      await tx.workspaceMember.delete({
        where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
      });
    });

    revalidatePath("/", "layout");
    revalidatePath("/more");
    revalidatePath("/workspace/members");

    return { success: true, message: t.workspaceActions.memberRemoved };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof WorkspaceRbacError) {
      return { success: false, message: error.message };
    }

    console.error("Failed to remove workspace member:", error);
    return { success: false, message: t.workspaceActions.removeMemberFailed };
  }
}
