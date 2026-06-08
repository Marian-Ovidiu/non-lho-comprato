export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { Rule } from "@/components/crafted";
import { CraftedSubpageHeader } from "@/src/components/layout/crafted-subpage-header";
import { CreateWorkspaceForm } from "@/src/components/workspace/create-workspace-form";
import { getAuthenticatedUser } from "@/src/lib/auth/session";

export default async function NewWorkspacePage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  return (
    <main className="pb-6">
      <CraftedSubpageHeader
        backHref="/more"
        title="Nuovo workspace"
        context="Crea uno spazio condiviso con un nome. Poi potrai invitare persone con un link."
      />
      <Rule />
      <section className="-mx-4 px-5 py-6 sm:-mx-6 lg:-mx-8">
        <CreateWorkspaceForm />
      </section>
    </main>
  );
}
