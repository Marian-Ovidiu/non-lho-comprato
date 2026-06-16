import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  E2E_AUTH_COOKIE,
  assertE2ETestAuthEnabled,
} from "@/src/lib/auth/e2e-test-auth";
import { prisma } from "@/src/lib/prisma";
import {
  WORKSPACE_SELECTION_COOKIE,
  getWorkspaceSelectionCookieOptions,
} from "@/src/lib/workspace-selection";

type TestAuthRequestBody = {
  userId?: string;
  workspaceId?: string;
};

export async function POST(request: Request) {
  try {
    assertE2ETestAuthEnabled();
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as TestAuthRequestBody;
  const userId = body.userId?.trim();

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Unknown user" }, { status: 404 });
  }

  const workspaceId = body.workspaceId?.trim();
  if (workspaceId) {
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        userId: user.id,
        workspaceId,
      },
      select: { id: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "User is not a workspace member" },
        { status: 403 },
      );
    }
  }

  const cookieStore = await cookies();
  cookieStore.set(E2E_AUTH_COOKIE, user.id, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: false,
  });

  if (workspaceId) {
    cookieStore.set(
      WORKSPACE_SELECTION_COOKIE,
      workspaceId,
      getWorkspaceSelectionCookieOptions(),
    );
  }

  return NextResponse.json({ ok: true });
}
