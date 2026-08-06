import { Mono, Rule } from "@/components/crafted";
import { CraftedInviteLoginShell } from "@/src/components/invites/crafted-invite-login-shell";
import { CraftedInviteMessage } from "@/src/components/invites/crafted-invite-message";
import { InviteAcceptancePanel } from "@/src/components/invites/invite-acceptance-panel";
import { CraftedSubpageHeader } from "@/src/components/layout/crafted-subpage-header";
import { getAuthenticatedUser } from "@/src/lib/auth/session";
import {
  getWorkspaceInviteUnavailableMessage,
  getWorkspaceInviteByTokenHash,
  hashInviteToken,
  isOpenWorkspaceInvite,
  isWorkspaceMember,
  normalizeInviteEmail,
} from "@/src/lib/workspace-invites";


type InvitePageProps = {
  params: Promise<{
    token: string;
  }>;
};

function describeInviter(createdBy: { name: string | null; email: string | null } | null) {
  const name = createdBy?.name?.trim();
  if (name) {
    return name;
  }

  const email = createdBy?.email?.trim();
  if (email) {
    return email.split("@")[0];
  }

  return null;
}

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

  // Revoca e scadenza non dipendono da chi apre il link: si dicono subito,
  // senza costringere a un login che non servirebbe a niente.
  if (invite.revokedAt) {
    return (
      <main className="pb-6">
        <CraftedInviteMessage
          title="Invito non disponibile"
          context="Questo invito non è più disponibile."
          message="Chiedi un nuovo link a chi ti ha invitato."
        />
      </main>
    );
  }

  if (invite.expiresAt.getTime() < now.getTime()) {
    return (
      <main className="pb-6">
        <CraftedInviteMessage
          title="Invito scaduto"
          context="Questo invito è scaduto."
          message="Chiedi un nuovo link a chi ti ha invitato."
        />
      </main>
    );
  }

  const authUser = await getAuthenticatedUser();
  const inviter = describeInviter(invite.createdBy);
  const workspaceName = invite.workspace.name;

  if (!authUser) {
    // Prima del login si dice chi invita e in cosa si sta entrando: senza
    // questo, il destinatario vede solo un link anonimo che chiede l'accesso.
    return (
      <CraftedInviteLoginShell
        redirectPath={`/invite/${token}`}
        title={inviter ? `${inviter} ti ha invitato` : "Sei stato invitato"}
        description={`Entri in «${workspaceName}», uno spazio condiviso per segnare le spese insieme: vedrete gli stessi movimenti e chi ha pagato cosa.`}
        panelTitle="Accedi per entrare"
        panelDescription="Bastano pochi secondi con Google, poi torni qui e sei dentro."
      />
    );
  }

  const isOpen = isOpenWorkspaceInvite(invite);
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

  // Un invito esaurito resta valido per chi è già dentro: deve poter riaprire
  // lo spazio dallo stesso link invece di sbattere contro "già usato".
  const alreadyMember = await isWorkspaceMember(invite.workspaceId, authUser.id);
  const unavailableMessage = alreadyMember
    ? null
    : getWorkspaceInviteUnavailableMessage(invite, now);

  if (unavailableMessage) {
    return (
      <main className="pb-6">
        <CraftedInviteMessage
          title="Invito non disponibile"
          context={unavailableMessage}
          message="Chiedi un nuovo link a chi ti ha invitato."
        />
      </main>
    );
  }

  return (
    <main className="pb-6">
      <CraftedSubpageHeader
        backHref="/"
        title={
          alreadyMember
            ? "Spazio condiviso"
            : inviter
              ? `${inviter} ti ha invitato`
              : "Invito condiviso"
        }
        context={
          alreadyMember
            ? `Fai già parte di «${workspaceName}». Puoi aprirlo subito.`
            : `Stai per entrare in «${workspaceName}», dove le spese si segnano in due.`
        }
        meta={
          <Mono className="shrink-0 text-[11px] text-ink-3">
            {invite.workspace.kind === "shared" ? "Condiviso" : "Privato"}
          </Mono>
        }
      />
      <Rule />
      <InviteAcceptancePanel token={token} workspaceNameHint={workspaceName} />
    </main>
  );
}
