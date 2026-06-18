import { redirect } from "next/navigation";

import { Rule } from "@/components/crafted";
import { CraftedSubpageHeader } from "@/src/components/layout/crafted-subpage-header";
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";
import { CraftedBudgetManagement } from "@/src/components/workspace/crafted-budget-management";
import { getWorkspaceBudgetsAction } from "@/src/actions/budgets";
import { formatDataLoadError } from "@/src/lib/data-load-error";
import { getAuthenticatedUser } from "@/src/lib/auth/session";

export default async function WorkspaceBudgetsPage() {
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    redirect("/login");
  }

  let loadError: string | null = null;
  let data: Awaited<ReturnType<typeof getWorkspaceBudgetsAction>> | null = null;

  try {
    data = await getWorkspaceBudgetsAction();
  } catch (error) {
    loadError = formatDataLoadError(error);
    console.error("Failed to load workspace budgets page:", error);
  }

  if (loadError || !data) {
    return (
      <main className="pb-6">
        <div className="px-5 pt-5 pb-4">
          <DataLoadErrorBanner
            title="Impossibile caricare i budget"
            message={loadError ?? "Workspace non disponibile. Riprova tra poco."}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="pb-6">
      <CraftedSubpageHeader
        backHref="/more"
        eyebrow="Workspace"
        title="Budget"
        context="I budget usano la spesa reale dei movimenti del workspace. Le categorie aiutano a leggere dove stai andando più veloce del previsto."
      />
      <Rule />
      <CraftedBudgetManagement
        initialBudgets={data.budgets}
        categories={data.categories}
        currency={data.workspace.currency}
      />
    </main>
  );
}
