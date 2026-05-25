export const dynamic = "force-dynamic";

import { getAuthenticatedUser } from "@/src/lib/auth/session";
import { redirect } from "next/navigation";
import { PageHeader } from "@/src/components/layout/page-header";
import { CreateWorkspaceForm } from "@/src/components/workspace/create-workspace-form";

export default async function NewWorkspacePage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  return (
    <main className="space-y-5 sm:space-y-6">
      <PageHeader
        backHref="/more"
        title="Nuovo workspace"
        context="Crea uno spazio condiviso con un nome. Poi potrai invitare persone con un link."
      />
      <CreateWorkspaceForm />
    </main>
  );
}
