export const WORKSPACE_SELECTION_COOKIE = "nlc-workspace-id";

export function getWorkspaceSelectionCookieOptions() {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
