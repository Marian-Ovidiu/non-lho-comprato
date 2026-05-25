import { LoginPanel } from "@/src/components/auth/login-panel";
import { InviteAcceptancePanel } from "@/src/components/invites/invite-acceptance-panel";
import { PageHeader } from "@/src/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getAuthenticatedUser } from "@/src/lib/auth/session";
import {
  getWorkspaceInviteByTokenHash,
  hashInviteToken,
  normalizeInviteEmail,
} from "@/src/lib/workspace-invites";

export const dynamic = "force-dynamic";

type InvitePageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function InviteTokenPage({ params }: InvitePageProps) {
  const { token } = await params;
  const invite = await getWorkspaceInviteByTokenHash(hashInviteToken(token));
  const now = new Date();

  if (!invite) {
    return (
      <main className="space-y-5 sm:space-y-6">
        <PageHeader
          title="Invito non disponibile"
          context="Questo link non è più valido."
        />

        <Card className="overflow-hidden border-border/80 bg-surface/80 shadow-sm">
          <CardContent className="p-4 text-sm leading-6 text-muted-text">
            Chiedi un nuovo link a chi ti ha invitato.
          </CardContent>
        </Card>
      </main>
    );
  }

  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-md items-center px-5 py-8 sm:px-6 lg:px-8">
        <section className="w-full space-y-5">
          <PageHeader
            title="Invito condiviso"
            context="Accedi per aprire l'invito con l'account giusto."
          />
          <LoginPanel
            compact
            providers={["google"]}
            className="mx-auto w-full"
            redirectPath={`/invite/${token}`}
            title="Accedi per accettare"
            description="Entra con Google e torna qui per completare l'invito."
          />
        </section>
      </main>
    );
  }

  if (invite.expiresAt.getTime() < now.getTime()) {
    return (
      <main className="space-y-5 sm:space-y-6">
        <PageHeader title="Invito non disponibile" context="Questo link è scaduto." />

        <Card className="overflow-hidden border-border/80 bg-surface/80 shadow-sm">
          <CardContent className="p-4 text-sm leading-6 text-muted-text">
            Chiedi un nuovo link a chi ti ha invitato.
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!invite.workspace) {
    return (
      <main className="space-y-5 sm:space-y-6">
        <PageHeader
          title="Invito non disponibile"
          context="Lo spazio collegato a questo invito non è più disponibile."
        />
      </main>
    );
  }

  const isOpen = invite.invitedEmail === "open";
  if (!isOpen) {
    const currentEmail = normalizeInviteEmail(authUser.email ?? "");
    if (!currentEmail || currentEmail !== invite.invitedEmail) {
      return (
        <main className="space-y-5 sm:space-y-6">
          <PageHeader
            title="Invito non disponibile"
            context="Apri questo link con l'account a cui è stato inviato."
          />

          <Card className="overflow-hidden border-border/80 bg-surface/80 shadow-sm">
            <CardContent className="p-4 text-sm leading-6 text-muted-text">
              Questo invito è collegato a un altro indirizzo email.
            </CardContent>
          </Card>
        </main>
      );
    }
  }

  const alreadyAccepted = Boolean(invite.acceptedAt);

  return (
    <main className="space-y-5 sm:space-y-6">
      <PageHeader
        backHref="/"
        title="Invito condiviso"
        context={
          alreadyAccepted
            ? "Questo spazio è già stato accettato. Puoi aprirlo subito."
            : "Stai per entrare in uno spazio condiviso."
        }
        chips={[
          {
            label: invite.workspace.kind === "shared" ? "Condiviso" : "Privato",
            tone: "premium",
          },
        ]}
      />

      <InviteAcceptancePanel
        token={token}
        workspaceNameHint={invite.workspace.name}
      />
    </main>
  );
}
