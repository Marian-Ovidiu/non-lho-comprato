"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";

import { prisma } from "@/src/lib/prisma";
import {
  WORKSPACE_SELECTION_COOKIE,
  getWorkspaceSelectionCookieOptions,
} from "@/src/lib/workspace-selection";
import { refreshSupabaseSessionForAction } from "@/src/lib/auth/action-session";
import {
  getCurrentWorkspaceId,
  getCurrentWorkspace,
  getCurrentUser,
  getCurrentWorkspaceMembers,
} from "@/src/lib/workspace-context";
import { isSupportedCurrency } from "@/src/lib/workspace-currency";
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

type CreateWorkspaceResult = {
  success: boolean;
  message: string;
  workspaceId?: string;
};

export async function createWorkspaceAction(
  formData: FormData,
): Promise<CreateWorkspaceResult> {
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { success: false, message: "Inserisci un nome per lo workspace." };
  }

  if (name.length > 80) {
    return { success: false, message: "Il nome è troppo lungo (max 80 caratteri)." };
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
          "Puoi creare un nuovo workspace solo partendo dal tuo workspace privato.",
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

    return { success: true, message: "Workspace creato.", workspaceId: workspace.id };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to create workspace:", error);
    return { success: false, message: "Non riesco a creare lo workspace adesso. Riprova." };
  }
}

export async function getCurrentWorkspaceMembersAction() {
  await refreshSupabaseSessionForAction();

  try {
    return await getCurrentWorkspaceMembers();
  } catch (error) {
    unstable_rethrow(error);
    console.error("getCurrentWorkspaceMembersAction failed:", error);
    return [];
  }
}

type GenerateOpenInviteResult = {
  success: boolean;
  message: string;
  inviteUrl?: string;
};

export async function generateOpenInviteAction(): Promise<GenerateOpenInviteResult> {
  try {
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
      return { success: false, message: "Nessuno workspace attivo." };
    }

    const token = generateInviteToken();
    const tokenHash = hashInviteToken(token);
    const invitePath = getWorkspaceInvitePath(token);
    const inviteUrl = await buildAbsoluteAppUrl(invitePath);

    if (!inviteUrl) {
      return { success: false, message: "Non riesco a costruire il link. Controlla NEXT_PUBLIC_APP_URL." };
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
      return { success: false, message: "Solo un owner può generare inviti." };
    }

    console.error("Failed to generate open invite:", error);
    return { success: false, message: "Non riesco a generare il link adesso. Riprova." };
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
    return { success: false, message: "Inserisci un link o codice valido." };
  }

  try {
    const user = await getCurrentUser();
    const tokenHash = hashInviteToken(token);

    const invite = await prisma.workspaceInvite.findUnique({
      where: { tokenHash },
      include: { workspace: { select: { id: true, name: true, kind: true } } },
    });

    if (!invite || !invite.workspace) {
      return { success: false, message: "Link non valido o non più disponibile." };
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
        return { success: false, message: "Questo link è destinato a un altro account." };
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
            "Link non valido o non più disponibile.",
          );
        }

        await tx.workspaceMember.create({
          data: { workspaceId: invite.workspaceId, userId: user.id, role: invite.role },
        });
      });
    }

    const cookieStore = await cookies();
    cookieStore.set(
      WORKSPACE_SELECTION_COOKIE,
      invite.workspaceId,
      getWorkspaceSelectionCookieOptions(),
    );

    revalidatePath("/", "layout");

    return { success: true, message: "Sei entrato nello workspace.", workspaceName: invite.workspace.name };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof WorkspaceRbacError) {
      return { success: false, message: error.message };
    }

    console.error("Failed to join workspace:", error);
    return { success: false, message: "Non riesco a unirti adesso. Riprova." };
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

  const cookieStore = await cookies();
  cookieStore.set(
    WORKSPACE_SELECTION_COOKIE,
    workspace.id,
    getWorkspaceSelectionCookieOptions(),
  );

  revalidatePath("/", "layout");

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
  const code = String(formData.get("currency") ?? "").trim().toUpperCase();

  if (!isSupportedCurrency(code)) {
    return { success: false, message: "Valuta non supportata." };
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
    return { success: false, message: "Non riesco ad aggiornare la valuta adesso. Riprova." };
  }
}

export async function removeWorkspaceMemberAction(
  targetUserId: string,
): Promise<RemoveMemberResult> {
  if (!targetUserId) {
    return { success: false, message: "Utente non specificato." };
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

    return { success: true, message: "Membro rimosso." };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof WorkspaceRbacError) {
      return { success: false, message: error.message };
    }

    console.error("Failed to remove workspace member:", error);
    return { success: false, message: "Non riesco a rimuovere il membro adesso. Riprova." };
  }
}
