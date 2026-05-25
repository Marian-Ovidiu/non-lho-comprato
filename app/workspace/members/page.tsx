import { Users } from "lucide-react";

import { PageHeader } from "@/src/components/layout/page-header";
import { GenerateInviteButton } from "@/src/components/workspace/generate-invite-button";
import { RemoveWorkspaceMemberButton } from "@/src/components/workspace/remove-workspace-member-button";
import {
  getCurrentWorkspace,
  getCurrentWorkspaceMemberDetails,
} from "@/src/lib/workspace-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

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
  const [workspace, members] = await Promise.all([
    getCurrentWorkspace(),
    getCurrentWorkspaceMemberDetails(),
  ]);

  return (
    <main className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Partecipanti"
        context={`Persone presenti in ${workspace.name}. Rimuovere una persona toglie l'accesso al workspace, ma non cancella i movimenti già creati o collegati a quell'utente.`}
        backHref="/more"
        chips={[
          { label: workspace.kind === "shared" ? "Condiviso" : "Privato", tone: "warm" },
          { label: `${members.length} partecipanti`, tone: "default" },
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="overflow-hidden border-border shadow-sm">
          <CardHeader className="space-y-1 p-4 pb-0 sm:p-5">
            <CardTitle className="text-base text-foreground">
              Dentro questo workspace
            </CardTitle>
            <p className="text-sm leading-6 text-muted-text">
              Chi è in lista può vedere e usare questo spazio.
            </p>
          </CardHeader>

          <CardContent className="space-y-3 p-4 sm:p-5">
            {members.map((member) => {
              const label = getMemberDisplayName(member);
              const initials = getInitials(label) || "U";

              return (
                <div
                  key={member.userId}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface text-xs font-semibold text-foreground">
                      {initials}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {label}
                        </p>
                        {member.isCurrentUser ? (
                          <span className="rounded-full border border-accent/20 bg-accent/8 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-accent">
                            Tu
                          </span>
                        ) : null}
                        <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-text">
                          {member.role === "owner" ? "Owner" : "Membro"}
                        </span>
                      </div>
                      {member.email ? (
                        <p className="truncate text-sm text-muted-text">{member.email}</p>
                      ) : null}
                    </div>
                  </div>

                  <RemoveWorkspaceMemberButton
                    userId={member.userId}
                    label={label}
                    isCurrentUser={member.isCurrentUser}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="h-fit overflow-hidden border-border shadow-sm">
          <CardHeader className="space-y-3 p-4 pb-0 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-background dark:bg-surface dark:text-foreground">
                <Users className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-base text-foreground">
                  Aggiungi persone
                </CardTitle>
                <p className="text-sm leading-6 text-muted-text">
                  Genera un link e mandalo a chi deve entrare.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-4 sm:p-5 sm:pt-4">
            <GenerateInviteButton />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
