export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";

import { Label, Rule } from "@/components/crafted";
import { CraftedSubpageHeader } from "@/src/components/layout/crafted-subpage-header";
import { CreateWorkspaceForm } from "@/src/components/workspace/create-workspace-form";
import { getAuthenticatedUser } from "@/src/lib/auth/session";
import {
  getCurrentUser,
  getCurrentWorkspace,
} from "@/src/lib/workspace-context";

export default async function NewWorkspacePage() {
  const authUser = await getAuthenticatedUser();
  if (!authUser) redirect("/login");

  const [user, workspace] = await Promise.all([
    getCurrentUser(),
    getCurrentWorkspace(),
  ]);
  const canCreateWorkspace =
    workspace.kind === "private" && workspace.ownerUserId === user.id;

  return (
    <main className="pb-6">
      <CraftedSubpageHeader
        backHref="/more"
        title="Nuovo workspace"
        context="Crea uno spazio condiviso con un nome. Poi potrai invitare persone con un link."
      />
      <Rule />
      <section className="-mx-4 px-5 py-6 sm:-mx-6 lg:-mx-8">
        {canCreateWorkspace ? (
          <CreateWorkspaceForm />
        ) : (
          <div className="space-y-4 border-y border-line py-5">
            <div>
              <Label className="mb-2 block">Workspace attivo</Label>
              <h2 className="text-lg font-semibold tracking-tight">
                Torna al tuo profilo privato
              </h2>
            </div>
            <p className="max-w-prose text-sm leading-6 text-ink-3">
              Ora sei in &ldquo;{workspace.name}&rdquo;. Per creare un nuovo
              workspace condiviso devi prima selezionare il tuo workspace
              privato dallo switcher.
            </p>
            <Link
              href="/more"
              className="inline-flex min-h-11 items-center justify-center border border-line px-4 text-sm font-semibold transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              Vai al profilo
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
