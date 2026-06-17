/**
 * Server-side only. Never import from client components.
 * Reads ADMIN_EMAILS (comma-separated) from env — not exposed to the browser.
 *
 * Dev behaviour when ADMIN_EMAILS is unset: any authenticated user is allowed.
 * Prod behaviour when ADMIN_EMAILS is unset: access is blocked.
 */
function getAdminEmails(): string[] | null {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw || !raw.trim()) return null;
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const list = getAdminEmails();

  if (list === null) {
    // ADMIN_EMAILS not configured
    return process.env.NODE_ENV !== "production";
  }

  return list.includes(email.toLowerCase());
}
