import crypto from "node:crypto";

export const WORKSPACE_INVITE_TTL_DAYS = 30;
export const OPEN_INVITE_SENTINEL = "open";
export const OPEN_INVITE_MAX_USES = 10;

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

function normalizeBaseUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString().replace(/\/+$/u, "");
  } catch {
    return null;
  }
}

export function resolveAppBaseUrl({
  appUrl,
  origin,
  forwardedOrigin,
  nodeEnv = process.env.NODE_ENV,
}: {
  appUrl?: string | null;
  origin?: string | null;
  forwardedOrigin?: string | null;
  nodeEnv?: string;
}) {
  const canonicalUrl = normalizeBaseUrl(appUrl);
  if (canonicalUrl) {
    return canonicalUrl;
  }

  if (nodeEnv === "production") {
    return null;
  }

  return normalizeBaseUrl(origin) ?? normalizeBaseUrl(forwardedOrigin);
}

export function getInviteExpiresAt(now = new Date()) {
  return new Date(now.getTime() + WORKSPACE_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

type WorkspaceInviteAvailability = {
  invitedEmail: string;
  type?: "email" | "open_link" | null;
  acceptedAt?: Date | null;
  expiresAt: Date;
  revokedAt?: Date | null;
  maxUses?: number | null;
  usedCount?: number | null;
};

export function isOpenWorkspaceInvite(invite: {
  invitedEmail: string;
  type?: "email" | "open_link" | null;
}) {
  return invite.type === "open_link" || invite.invitedEmail === OPEN_INVITE_SENTINEL;
}

export function getWorkspaceInviteUnavailableMessage(
  invite: WorkspaceInviteAvailability,
  now = new Date(),
) {
  if (invite.revokedAt) {
    return "Questo invito non è più disponibile.";
  }

  if (invite.expiresAt.getTime() < now.getTime()) {
    return "Questo invito è scaduto.";
  }

  const maxUses = invite.maxUses ?? 1;
  const usedCount = invite.usedCount ?? (invite.acceptedAt ? 1 : 0);
  if (usedCount >= maxUses) {
    return isOpenWorkspaceInvite(invite)
      ? "Questo link ha raggiunto il numero massimo di utilizzi."
      : "Questo invito è già stato usato.";
  }

  return null;
}
