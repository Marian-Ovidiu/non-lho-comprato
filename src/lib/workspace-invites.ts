import crypto from "node:crypto";

import { headers } from "next/headers";

import { prisma } from "@/src/lib/prisma";

export const WORKSPACE_INVITE_TTL_DAYS = 30;

export type WorkspaceInviteWithWorkspace = Awaited<
  ReturnType<typeof getWorkspaceInviteByTokenHash>
>;

export function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidInviteEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email.trim());
}

export function generateInviteToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getWorkspaceInvitePath(token: string) {
  return `/invite/${token}`;
}

export async function getAppBaseUrl() {
  const headerStore = await headers();
  const origin =
    headerStore.get("origin")?.trim() ||
    headerStore.get("x-forwarded-origin")?.trim();

  if (origin) {
    return origin;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    return appUrl.replace(/\/+$/u, "");
  }

  return null;
}

export async function buildAbsoluteAppUrl(pathname: string) {
  const baseUrl = await getAppBaseUrl();

  if (!baseUrl) {
    return null;
  }

  return new URL(pathname, baseUrl).toString();
}

export function getInviteExpiresAt(now = new Date()) {
  return new Date(now.getTime() + WORKSPACE_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
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
