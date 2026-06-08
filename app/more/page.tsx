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
import { getAuthenticatedUser, getCurrentWorkspace } from "@/src/lib/auth/session";
import { getCurrentWorkspaceMembers } from "@/src/lib/workspace-context";

export const dynamic = "force-dynamic";

type WorkspaceNextStep = NonNullable<CraftedMoreProps["workspaceNextStep"]>;

function getWorkspaceNextStep(
  workspace: Awaited<ReturnType<typeof getCurrentWorkspace>>,
  memberCount: number,
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

  if (memberCount <= 2) {
    return {
      title: "Workspace quasi vuoto",
      description:
        "Siete ancora in pochi. Invita almeno un'altra persona per iniziare a condividere i movimenti.",
      actionLabel: "Invita persone",
      href: "/workspace/members",
    };
  }

  return null;
}

export default async function MorePage() {
  const [authUser, workspaceResult, members, monthSummary, streakResult] = await Promise.all([
    getAuthenticatedUser(),
    getCurrentWorkspace().catch(() => null),
    getCurrentWorkspaceMembers().catch(() => []),
    getDashboardSummary().catch(() => null),
    getGlobalStreak().catch(() => ({ currentStreak: 0, bestStreak: 0, streakDates: [] })),
  ]);

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
    ? getWorkspaceNextStep(workspace, members.length)
    : null;

  return (
    <main>
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
    </main>
  );
}
