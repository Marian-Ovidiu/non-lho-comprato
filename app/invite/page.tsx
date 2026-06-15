
import { Label, Mono, Rule } from "@/components/crafted";
import { CraftedInviteLoginShell } from "@/src/components/invites/crafted-invite-login-shell";
import { InviteCreationForm } from "@/src/components/invites/invite-creation-form";
import { CraftedSubpageHeader } from "@/src/components/layout/crafted-subpage-header";
import { getAuthenticatedUser, getCurrentWorkspace } from "@/src/lib/auth/session";

export default async function InvitePage() {
  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    return (
      <CraftedInviteLoginShell
        redirectPath="/invite"
        title="Invita una persona"
        description="Accedi per creare un invito per il tuo spazio condiviso."
        panelTitle="Accedi per invitare"
        panelDescription="Entra con Google e torna qui per creare il link di invito."
      />
    );
  }

  const currentWorkspace = await getCurrentWorkspace();

  return (
    <main className="pb-6">
      <CraftedSubpageHeader
        backHref="/more"
        title="Invita una persona"
        context={
          currentWorkspace.kind === "shared"
            ? "Invia un link a una persona. Quando accetta, vedrete gli stessi movimenti condivisi."
            : "Stiamo creando uno spazio condiviso e poi inviteremo la persona."
        }
        meta={
          <Mono className="shrink-0 text-[11px] text-ink-3">
            {currentWorkspace.kind === "shared" ? "Condiviso" : "Privato"}
          </Mono>
        }
      />
      <Rule />
      <section className="-mx-4 px-5 py-6 sm:-mx-6 lg:-mx-8">
        <Label className="mb-4 block">Link invito</Label>
        <InviteCreationForm
          currentWorkspace={{
            id: currentWorkspace.id,
            name: currentWorkspace.name,
            kind: currentWorkspace.kind,
            isShared: currentWorkspace.kind === "shared",
          }}
        />
      </section>
    </main>
  );
}
