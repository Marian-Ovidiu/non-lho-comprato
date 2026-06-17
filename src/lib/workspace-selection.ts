export const WORKSPACE_SELECTION_COOKIE = "nlc-workspace-id";

export function getWorkspaceSelectionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
