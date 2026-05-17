"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/src/lib/prisma";
import { getCurrentWorkspace } from "@/src/lib/auth/session";
import {
  WORKSPACE_SELECTION_COOKIE,
  getWorkspaceSelectionCookieOptions,
} from "@/src/lib/workspace-selection";
import { getCurrentUser } from "@/src/lib/workspace-context";

export async function switchWorkspaceAction(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "/").trim() || "/";

  if (!workspaceId) {
    redirect(returnTo);
  }

  const user = await getCurrentUser();
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      OR: [
        {
          ownerUserId: user.id,
        },
        {
          members: {
            some: {
              userId: user.id,
            },
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  const cookieStore = await cookies();
  const targetWorkspaceId = workspace?.id ?? (await getCurrentWorkspace()).id;

  cookieStore.set(
    WORKSPACE_SELECTION_COOKIE,
    targetWorkspaceId,
    getWorkspaceSelectionCookieOptions(),
  );

  revalidatePath("/", "layout");
  revalidatePath(returnTo);

  redirect(returnTo);
}
