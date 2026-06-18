import Link from "next/link";

import {
  CraftedMore,
  type CraftedMoreProps,
} from "@/src/components/more/crafted-more";
import {
  CraftedMoreAppTools,
  CraftedMoreWorkspaceTools,
} from "@/src/components/more/crafted-more-tools";
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";
import { formatEntryLoadError } from "@/src/lib/entry-load-debug";
import { getAuthenticatedUser, getCurrentWorkspace } from "@/src/lib/auth/session";
import { getTranslations } from "@/src/lib/i18n";
import { getCurrentWorkspaceLanguage } from "@/src/lib/workspace-context";

const DEVELOPER_EMAIL = "h.marian914@gmail.com";

export default async function MorePage() {
  const language = await getCurrentWorkspaceLanguage();
  const t = getTranslations(language);

  let loadError: string | null = null;
  let authUser: Awaited<ReturnType<typeof getAuthenticatedUser>> = null;
  let workspaceResult: Awaited<ReturnType<typeof getCurrentWorkspace>> | null = null;

  try {
    [authUser, workspaceResult] = await Promise.all([
      getAuthenticatedUser(),
      getCurrentWorkspace().catch(() => null),
    ]);
  } catch (error) {
    loadError = formatEntryLoadError(error);
    console.error("Failed to load more page:", error);
  }

  const workspace = workspaceResult;
  const profileLabel = authUser?.name ?? authUser?.email ?? "Account";
  const workspaceLabel = workspace
    ? workspace.kind === "shared"
      ? t.common.shared
      : t.common.private
    : "Nessun workspace";

  return (
    <main>
      {loadError ? (
        <div className="px-5 pt-5 pb-4">
          <DataLoadErrorBanner
            title={t.shared.dataLoadError}
            message={loadError}
          />
        </div>
      ) : null}
      <CraftedMore
        profileLabel={profileLabel}
        workspaceName={workspace?.name ?? null}
        workspaceLabel={workspaceLabel}
        isAuthenticated={Boolean(authUser)}
        showWorkspaceTools={Boolean(workspace)}
        workspaceSection={<CraftedMoreWorkspaceTools />}
        appSection={<CraftedMoreAppTools />}
      />
      {authUser?.email === DEVELOPER_EMAIL ? (
        <div className="px-5 pb-4 pt-2">
          <Link
            href="/debug"
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Debug app
          </Link>
        </div>
      ) : null}
    </main>
  );
}
