import Link from "next/link";

import { getDashboardSummary } from "@/src/actions/entries";
import { getGlobalStreak } from "@/src/actions/streaks";
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

const DEVELOPER_EMAIL = "h.marian914@gmail.com";

export const dynamic = "force-dynamic";

type WorkspaceNextStep = NonNullable<CraftedMoreProps["workspaceNextStep"]>;

function getWorkspaceNextStep(
  workspace: Awaited<ReturnType<typeof getCurrentWorkspace>>,
): WorkspaceNextStep | null {
  if (workspace.kind === "private") {
    return {
      title: "Workspace privato",
      description:
        "Se vuoi lavorare con altre persone, il prossimo passo utile è creare uno spazio condiviso.",
      actionLabel: "Crea workspace condiviso",
      href: "/workspace/new",
    };
  }

  return null;
}

export default async function MorePage() {
  let loadError: string | null = null;
  let authUser: Awaited<ReturnType<typeof getAuthenticatedUser>> = null;
  let workspaceResult: Awaited<ReturnType<typeof getCurrentWorkspace>> | null = null;
  let monthSummary: Awaited<ReturnType<typeof getDashboardSummary>> | null = null;
  let streakResult: Awaited<ReturnType<typeof getGlobalStreak>> = {
    currentStreak: 0,
    bestStreak: 0,
    streakDates: [],
  };

  try {
    [authUser, workspaceResult, monthSummary, streakResult] = await Promise.all([
      getAuthenticatedUser(),
      getCurrentWorkspace().catch(() => null),
      getDashboardSummary().catch(() => null),
      getGlobalStreak().catch(() => ({ currentStreak: 0, bestStreak: 0, streakDates: [] })),
    ]);
  } catch (error) {
    loadError = formatEntryLoadError(error);
    console.error("Failed to load more page:", error);
  }

  const workspace = workspaceResult;
  const profileLabel = authUser?.name ?? authUser?.email ?? "Account";
  const workspaceLabel = workspace
    ? workspace.kind === "shared"
      ? "Condiviso"
      : "Privato"
    : "Nessun workspace";
  const workspaceInitials = workspace
    ? workspace.name
        .split(" ")
        .map((part) => part.trim().charAt(0))
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "NL";
  const workspaceNextStep = workspace
    ? getWorkspaceNextStep(workspace)
    : null;

  return (
    <main>
      {loadError ? (
        <div className="px-5 pt-5 pb-4">
          <DataLoadErrorBanner
            title="Alcuni dati non sono disponibili"
            message={loadError}
          />
        </div>
      ) : null}
      <CraftedMore
        profileLabel={profileLabel}
        workspaceName={workspace?.name ?? null}
        workspaceLabel={workspaceLabel}
        workspaceInitials={workspaceInitials}
        isAuthenticated={Boolean(authUser)}
        monthSaved={monthSummary?.totalSaved ?? 0}
        entriesCount={monthSummary?.entriesCount ?? 0}
        streak={streakResult.currentStreak}
        workspaceNextStep={workspaceNextStep}
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
