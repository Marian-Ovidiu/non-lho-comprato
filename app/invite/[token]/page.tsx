import { Label, Mono, Rule } from "@/components/crafted";
import { CraftedInviteLoginShell } from "@/src/components/invites/crafted-invite-login-shell";
import { CraftedInviteMessage } from "@/src/components/invites/crafted-invite-message";
import { InviteAcceptancePanel } from "@/src/components/invites/invite-acceptance-panel";
import { CraftedSubpageHeader } from "@/src/components/layout/crafted-subpage-header";
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
      <main className="pb-6">
        <CraftedInviteMessage
          title="Invito non disponibile"
          context="Questo link non è più valido."
          message="Chiedi un nuovo link a chi ti ha invitato."
        />
      </main>
    );
  }

  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    return (
      <CraftedInviteLoginShell
        redirectPath={`/invite/${token}`}
        title="Invito condiviso"
        description="Accedi per aprire l'invito con l'account giusto."
        panelTitle="Accedi per accettare"
        panelDescription="Entra con Google e torna qui per completare l'invito."
      />
    );
  }

  if (invite.expiresAt.getTime() < now.getTime()) {
    return (
      <main className="pb-6">
        <CraftedInviteMessage
          title="Invito non disponibile"
          context="Questo link è scaduto."
          message="Chiedi un nuovo link a chi ti ha invitato."
        />
      </main>
    );
  }

  if (!invite.workspace) {
    return (
      <main className="pb-6">
        <CraftedInviteMessage
          title="Invito non disponibile"
          context="Lo spazio collegato a questo invito non è più disponibile."
          message="Chiedi un nuovo link a chi ti ha invitato."
        />
      </main>
    );
  }

  const isOpen = invite.invitedEmail === "open";
  if (!isOpen) {
    const currentEmail = normalizeInviteEmail(authUser.email ?? "");
    if (!currentEmail || currentEmail !== invite.invitedEmail) {
      return (
        <main className="pb-6">
          <CraftedInviteMessage
            title="Invito non disponibile"
            context="Apri questo link con l'account a cui è stato inviato."
            message="Questo invito è collegato a un altro indirizzo email."
          />
        </main>
      );
    }
  }

  const alreadyAccepted = Boolean(invite.acceptedAt);

  return (
    <main className="pb-6">
      <CraftedSubpageHeader
        backHref="/"
        title="Invito condiviso"
        context={
          alreadyAccepted
            ? "Questo spazio è già stato accettato. Puoi aprirlo subito."
            : "Stai per entrare in uno spazio condiviso."
        }
        meta={
          <Mono className="shrink-0 text-[11px] text-ink-3">
            {invite.workspace.kind === "shared" ? "Condiviso" : "Privato"}
          </Mono>
        }
      />
      <Rule />
      <InviteAcceptancePanel token={token} workspaceNameHint={invite.workspace.name} />
    </main>
  );
}
