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
  getCurrentUser,
  getCurrentWorkspaceMembers,
} from "@/src/lib/workspace-context";
import {
  buildAbsoluteAppUrl,
  generateInviteToken,
  getInviteExpiresAt,
  getWorkspaceInvitePath,
  hashInviteToken,
} from "@/src/lib/workspace-invites";

const OPEN_INVITE_SENTINEL = "open";

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
    const user = await getCurrentUser();

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
    const workspaceId = await (await import("@/src/lib/workspace-context")).getCurrentWorkspaceId();

    const workspace = await prisma.workspace.findUnique({
      where: {
        id: workspaceId,
        OR: [
          { ownerUserId: user.id },
          { members: { some: { userId: user.id } } },
        ],
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
        invitedEmail: OPEN_INVITE_SENTINEL,
        createdByUserId: user.id,
        expiresAt: getInviteExpiresAt(),
      },
    });

    return { success: true, message: "Link generato.", inviteUrl };
  } catch (error) {
    unstable_rethrow(error);
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

    if (invite.expiresAt.getTime() < Date.now()) {
      return { success: false, message: "Questo link è scaduto." };
    }

    const isOpen = invite.invitedEmail === OPEN_INVITE_SENTINEL;

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
      await prisma.$transaction(async (tx) => {
        await tx.workspaceMember.create({
          data: { workspaceId: invite.workspaceId, userId: user.id, role: "member" },
        });

        if (!isOpen) {
          await tx.workspaceInvite.update({
            where: { id: invite.id },
            data: { acceptedAt: new Date(), acceptedByUserId: user.id },
          });
        }
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

export async function removeWorkspaceMemberAction(
  targetUserId: string,
): Promise<RemoveMemberResult> {
  if (!targetUserId) {
    return { success: false, message: "Utente non specificato." };
  }

  try {
    const { getCurrentWorkspaceId } = await import("@/src/lib/workspace-context");
    const user = await getCurrentUser();
    const workspaceId = await getCurrentWorkspaceId();

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
      select: { id: true },
    });

    if (!membership) {
      return { success: false, message: "Non sei membro di questo workspace." };
    }

    const targetMembership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
      select: { id: true },
    });

    if (!targetMembership) {
      return { success: false, message: "Membro non trovato." };
    }

    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    });

    revalidatePath("/", "layout");
    revalidatePath("/more");
    revalidatePath("/workspace/members");

    return { success: true, message: "Membro rimosso." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to remove workspace member:", error);
    return { success: false, message: "Non riesco a rimuovere il membro adesso. Riprova." };
  }
}
