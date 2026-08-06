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

const LOOPBACK_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
]);

/// Un base URL locale è legittimo in sviluppo e mortale in produzione: i link
/// di invito vengono condivisi fuori dal dispositivo che li genera, quindi un
/// host di loopback produce link che non si apriranno mai per il destinatario.
export function isLoopbackBaseUrl(value: string | null | undefined) {
  const normalized = normalizeBaseUrl(value);
  if (!normalized) {
    return false;
  }

  const hostname = new URL(normalized).hostname.toLowerCase();
  return LOOPBACK_HOSTNAMES.has(hostname) || hostname.endsWith(".local");
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
  const isProduction = nodeEnv === "production";
  const canonicalUrl = normalizeBaseUrl(appUrl);

  // In produzione il canonical resta l'unica fonte accettata (le intestazioni
  // di richiesta sono manipolabili), ma un canonical di loopback va trattato
  // come assente: meglio un errore visibile che un link morto condiviso.
  if (canonicalUrl && !(isProduction && isLoopbackBaseUrl(canonicalUrl))) {
    return canonicalUrl;
  }

  if (isProduction) {
    return null;
  }

  return normalizeBaseUrl(origin) ?? normalizeBaseUrl(forwardedOrigin);
}

/// Spiega perché il link non è costruibile, per non lasciare l'utente davanti
/// a un errore generico su un problema che è solo di configurazione.
export function describeAppBaseUrlProblem({
  appUrl,
  nodeEnv = process.env.NODE_ENV,
}: {
  appUrl?: string | null;
  nodeEnv?: string;
}) {
  if (nodeEnv !== "production") {
    return null;
  }

  if (!normalizeBaseUrl(appUrl)) {
    return "NEXT_PUBLIC_APP_URL non è configurato: senza indirizzo pubblico il link di invito non può essere creato.";
  }

  if (isLoopbackBaseUrl(appUrl)) {
    return "NEXT_PUBLIC_APP_URL punta a un indirizzo locale: i link generati non si aprirebbero su nessun altro dispositivo.";
  }

  return null;
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
