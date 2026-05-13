import { LoginPanel } from "@/src/components/auth/login-panel";
import { InviteCreationForm } from "@/src/components/invites/invite-creation-form";
import { PageHeader } from "@/src/components/layout/page-header";
import { getAuthenticatedUser, getCurrentWorkspace } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function InvitePage() {
  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-md items-center px-5 py-8 sm:px-6 lg:px-8">
        <section className="w-full space-y-5">
          <PageHeader
            title="Invita una persona"
            context="Accedi per creare un invito per il tuo spazio."
          />
          <LoginPanel
            compact
            providers={["google"]}
            className="mx-auto w-full"
            redirectPath="/invite"
            title="Accedi per invitare"
            description="Entra con Google e torna qui per creare il link di invito."
          />
        </section>
      </main>
    );
  }

  const currentWorkspace = await getCurrentWorkspace();

  return (
    <main className="space-y-5 sm:space-y-6">
      <PageHeader
        backHref="/more"
        title="Invita una persona"
        context={
          currentWorkspace.kind === "shared"
            ? "Invia un link a una persona. Quando accetta, vedrete gli stessi movimenti condivisi."
            : "Stai usando uno spazio privato. Creeremo uno spazio condiviso e poi inviteremo la persona."
        }
        chips={[
          {
            label: currentWorkspace.kind === "shared" ? "Condiviso" : "Privato",
            tone: currentWorkspace.kind === "shared" ? "success" : "premium",
          },
        ]}
      />

      <InviteCreationForm
        currentWorkspace={{
          id: currentWorkspace.id,
          name: currentWorkspace.name,
          kind: currentWorkspace.kind,
          isShared: currentWorkspace.kind === "shared",
        }}
      />
    </main>
  );
}
