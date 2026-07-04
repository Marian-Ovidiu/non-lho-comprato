import { getTranslations, type Translations } from "@/src/lib/i18n";
import { getCurrentWorkspaceLanguage } from "@/src/lib/workspace-context";

/**
 * Translations for the current workspace, for server actions that return
 * user-facing messages. Pure validation helpers should instead accept a
 * translations argument defaulting to the Italian dictionary, so unit tests
 * keep asserting the canonical strings without a workspace in scope.
 */
export async function getActionTranslations(): Promise<Translations> {
  return getTranslations(await getCurrentWorkspaceLanguage());
}
