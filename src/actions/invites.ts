"use server";

import { cookies } from "next/headers";

import { prisma } from "@/src/lib/prisma";
import {
  getCurrentUser,
  getCurrentWorkspace,
} from "@/src/lib/workspace-context";
import {
  generateInviteToken,
  getInviteExpiresAt,
  getWorkspaceInviteByTokenHash,
  getWorkspaceInvitePath,
  hashInviteToken,
  isValidInviteEmail,
  normalizeInviteEmail,
} from "@/src/lib/workspace-invites";
import {
  WORKSPACE_SELECTION_COOKIE,
  getWorkspaceSelectionCookieOptions,
} from "@/src/lib/workspace-selection";
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

export async function createWorkspaceInviteAction(
  formData: FormData,
): Promise<CreateWorkspaceInviteResult> {
  const invitedEmailRaw = getText(formData, "email");
  const workspaceNameRaw = getText(formData, "workspaceName");
  const errors: Record<string, string> = {};

  if (!invitedEmailRaw) {
    errors.email = "Inserisci un indirizzo email";
  } else if (!isValidInviteEmail(invitedEmailRaw)) {
    errors.email = "Inserisci un indirizzo email valido";
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      message: "Controlla i campi evidenziati",
      errors,
    };
  }

  try {
    const currentUser = await getCurrentUser();
    const currentWorkspace = await getCurrentWorkspace();
    const invitedEmail = normalizeInviteEmail(invitedEmailRaw);
    const currentEmail = normalizeInviteEmail(currentUser.email ?? "");

    if (!currentEmail) {
      return {
        success: false,
        message: "Serve un account con email per invitare una persona.",
      };
    }

    if (invitedEmail === currentEmail) {
      return {
        success: false,
        message: "Non puoi invitare il tuo stesso account.",
        errors: {
          email: "Usa un altro indirizzo email",
        },
      };
    }

    const token = generateInviteToken();
    const tokenHash = hashInviteToken(token);

    const targetWorkspace = await prisma.$transaction(async (tx) => {
      if (currentWorkspace.kind === "shared") {
        await tx.workspaceInvite.create({
          data: {
            tokenHash,
            workspaceId: currentWorkspace.id,
            invitedEmail,
            createdByUserId: currentUser.id,
            expiresAt: getInviteExpiresAt(),
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
          invitedEmail,
          createdByUserId: currentUser.id,
          expiresAt: getInviteExpiresAt(),
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
      message: "Invito pronto",
      invitePath: getWorkspaceInvitePath(token),
      workspace: {
        id: targetWorkspace.id,
        name: targetWorkspace.name,
        kind: targetWorkspace.kind,
      },
      createdSharedWorkspace: currentWorkspace.kind === "private",
    };
  } catch (error) {
    console.error("Failed to create workspace invite:", error);
    return {
      success: false,
      message: "Non riesco a creare l'invito adesso. Riprova tra poco.",
    };
  }
}

export async function acceptWorkspaceInviteAction(
  formData: FormData,
): Promise<AcceptWorkspaceInviteResult> {
  const token = getText(formData, "token");

  if (!token) {
    return {
      success: false,
      message: "Invito non valido",
    };
  }

  try {
    const currentUser = await getCurrentUser();
    const invite = await getWorkspaceInviteByTokenHash(hashInviteToken(token));

    if (!invite) {
      return {
        success: false,
        message: "Questo invito non è disponibile.",
      };
    }

    if (invite.workspace == null) {
      return {
        success: false,
        message: "Lo spazio condiviso non è più disponibile.",
      };
    }

    if (invite.expiresAt.getTime() < Date.now()) {
      return {
        success: false,
        message: "Questo invito è scaduto.",
      };
    }

    const currentEmail = normalizeInviteEmail(currentUser.email ?? "");
    if (!currentEmail) {
      return {
        success: false,
        message: "Serve un account con email per accettare l'invito.",
      };
    }

    if (currentEmail !== invite.invitedEmail) {
      return {
        success: false,
        message: "Apri questo invito con l'account a cui è stato inviato.",
      };
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
      cookieStore.set(
        WORKSPACE_SELECTION_COOKIE,
        invite.workspaceId,
        getWorkspaceSelectionCookieOptions(),
      );

      tryRevalidatePath("/");
      tryRevalidatePath("/more");

      return {
        success: true,
        message: "Sei già dentro questo spazio.",
        status: "already_member",
        workspace: {
          id: invite.workspace.id,
          name: invite.workspace.name,
          kind: invite.workspace.kind,
        },
      };
    }

    if (invite.acceptedAt) {
      return {
        success: false,
        message: "Questo invito è già stato usato.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId: currentUser.id,
          role: "member",
        },
      });

      await tx.workspaceInvite.update({
        where: {
          id: invite.id,
        },
        data: {
          acceptedAt: new Date(),
          acceptedByUserId: currentUser.id,
        },
      });
    });

    const cookieStore = await cookies();
    cookieStore.set(
      WORKSPACE_SELECTION_COOKIE,
      invite.workspaceId,
      getWorkspaceSelectionCookieOptions(),
    );

    tryRevalidatePath("/");
    tryRevalidatePath("/more");

    return {
      success: true,
      message: "Invito accettato",
      status: "accepted",
      workspace: {
        id: invite.workspace.id,
        name: invite.workspace.name,
        kind: invite.workspace.kind,
      },
    };
  } catch (error) {
    console.error("Failed to accept workspace invite:", error);
    return {
      success: false,
      message: "Non riesco ad accettare l'invito adesso. Riprova tra poco.",
    };
  }
}
