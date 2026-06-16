import "server-only";

import { getAuthenticatedUser, getCurrentWorkspace } from "@/src/lib/auth/session";
import { DEFAULT_WORKSPACE_LANGUAGE } from "@/src/lib/workspace-language";

/**
 * Resolves the html[lang] attribute for the root layout.
 * Both calls are cache()-wrapped so they deduplicate with LayoutAuthShell.
 * Falls back to DEFAULT_WORKSPACE_LANGUAGE for unauthenticated users or on error.
 */
export async function getHtmlLang(): Promise<string> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return DEFAULT_WORKSPACE_LANGUAGE;
    const workspace = await getCurrentWorkspace();
    return workspace.language ?? DEFAULT_WORKSPACE_LANGUAGE;
  } catch {
    return DEFAULT_WORKSPACE_LANGUAGE;
  }
}
