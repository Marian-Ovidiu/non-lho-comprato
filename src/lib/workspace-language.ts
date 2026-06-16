import { getAuthenticatedUser, getCurrentWorkspace } from "@/src/lib/auth/session";

export const DEFAULT_WORKSPACE_LANGUAGE = "it";

export type SupportedLanguage = {
  code: string;
  name: string;
  nativeName: string;
};

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "en", name: "English", nativeName: "English" },
];

export function isSupportedLanguage(code: string): boolean {
  return SUPPORTED_LANGUAGES.some((l) => l.code === code);
}

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
