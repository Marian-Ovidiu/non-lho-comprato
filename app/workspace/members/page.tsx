import { Label, Mono, Rule } from "@/components/crafted";
import { unstable_rethrow } from "next/navigation";
import { CraftedSubpageHeader } from "@/src/components/layout/crafted-subpage-header";
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";
import { GenerateInviteButton } from "@/src/components/workspace/generate-invite-button";
import { RemoveWorkspaceMemberButton } from "@/src/components/workspace/remove-workspace-member-button";
import { WorkspaceExitActions } from "@/src/components/workspace/workspace-exit-actions";
import {
  canDeleteWorkspace,
  canLeaveWorkspace,
} from "@/src/features/workspaces/membership-policy";
import { formatEntryLoadError } from "@/src/lib/entry-load-debug";
import {
  getCurrentWorkspace,
  getCurrentWorkspaceMemberDetails,
} from "@/src/lib/workspace-context";


function getMemberDisplayName(member: {
  name: string | null;
  email: string | null;
  userId: string;
}) {
  return member.name ?? member.email ?? member.userId;
}

function getInitials(label: string) {
  return label
    .split(" ")
    .map((part) => part.trim().charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function WorkspaceMembersPage() {
  let loadError: string | null = null;
  let workspace: Awaited<ReturnType<typeof getCurrentWorkspace>> | null = null;
  let members: Awaited<ReturnType<typeof getCurrentWorkspaceMemberDetails>> = [];

  try {
    [workspace, members] = await Promise.all([
      getCurrentWorkspace(),
      getCurrentWorkspaceMemberDetails(),
    ]);
  } catch (error) {
    unstable_rethrow(error);
    loadError = formatEntryLoadError(error);
    console.error("Failed to load workspace members page:", error);
  }

  if (loadError || !workspace) {
    return (
      <main className="pb-6">
        <div className="px-5 pt-5 pb-4">
          <DataLoadErrorBanner
            title="Impossibile caricare i partecipanti"
            message={loadError ?? "Workspace non disponibile. Riprova tra poco."}
          />
        </div>
      </main>
    );
  }

  const currentUserId = members.find((member) => member.isCurrentUser)?.userId ?? null;
  const leaveDecision = canLeaveWorkspace({
    workspaceKind: workspace.kind,
    isMember: currentUserId != null,
    memberCount: members.length,
  });
  const deleteDecision = canDeleteWorkspace({
    workspaceKind: workspace.kind,
    isMember: currentUserId != null,
    memberCount: members.length,
    actorUserId: currentUserId ?? "",
    workspaceOwnerUserId: workspace.ownerUserId,
  });

  return (
    <main className="pb-6">
      <CraftedSubpageHeader
        backHref="/more"
        eyebrow="Workspace"
        title="Partecipanti"
        context="Persone presenti in questo spazio. Rimuovere qualcuno toglie l'accesso, ma non cancella i movimenti già creati."
        meta={
          <Mono className="shrink-0 text-[11px] text-ink-3">
            {workspace.kind === "shared" ? "Condiviso" : "Privato"} · {members.length}
          </Mono>
        }
      />

      <Rule />

      <section className="-mx-4 px-5 py-6 sm:-mx-6 lg:-mx-8">
        <Label className="mb-4 block">In questo workspace</Label>
        <div>
          {members.map((member, index) => {
            const label = getMemberDisplayName(member);
            const initials = getInitials(label) || "U";

            return (
              <div key={member.userId}>
                <div className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center border border-line text-[11px] font-semibold text-foreground">
                      {initials}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[15px] font-[450]">{label}</p>
                        {member.isCurrentUser ? (
                          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-accent">
                            Tu
                          </span>
                        ) : null}
                        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-3">
                          {member.role === "owner" ? "Owner" : "Membro"}
                        </span>
                      </div>
                      {member.email ? (
                        <p className="truncate text-xs text-ink-3">{member.email}</p>
                      ) : null}
                    </div>
                  </div>
                  <RemoveWorkspaceMemberButton
                    userId={member.userId}
                    label={label}
                    isCurrentUser={member.isCurrentUser}
                  />
                </div>
                {index < members.length - 1 ? <Rule soft /> : null}
              </div>
            );
          })}
        </div>
      </section>

      <Rule />

      <section className="-mx-4 px-5 py-6 sm:-mx-6 lg:-mx-8">
        <Label className="mb-2 block">Aggiungi persone</Label>
        <p className="mb-5 text-sm text-ink-3">
          Genera un link e mandalo a chi deve entrare nel workspace.
        </p>
        <GenerateInviteButton />
      </section>

      <WorkspaceExitActions
        workspaceId={workspace.id}
        workspaceName={workspace.name}
        canLeave={leaveDecision.allowed}
        canDelete={deleteDecision.allowed}
        deleteBlockedReason={
          workspace.kind === "shared" && !deleteDecision.allowed
            ? deleteDecision.message
            : null
        }
      />
    </main>
  );
}
