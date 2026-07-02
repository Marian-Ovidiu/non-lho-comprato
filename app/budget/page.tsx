import { unstable_rethrow } from "next/navigation";

import { CraftedBudgetPage } from "@/src/components/budget/crafted-budget-page";
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";
import { CraftedBudgetManagement } from "@/src/components/workspace/crafted-budget-management";
import { buildCraftedBudgetProps } from "@/src/lib/crafted-budget-build";
import { formatEntryLoadError } from "@/src/lib/entry-load-debug";

type BudgetPageProps = {
  searchParams: Promise<{
    month?: string | string[];
  }>;
};

function getFirstSearchParamValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BudgetPage({ searchParams }: BudgetPageProps) {
  const resolvedSearchParams = await searchParams;
  let loadError: string | null = null;
  let budgetProps: Awaited<ReturnType<typeof buildCraftedBudgetProps>> | null = null;

  try {
    budgetProps = await buildCraftedBudgetProps(
      getFirstSearchParamValue(resolvedSearchParams.month),
    );
  } catch (error) {
    unstable_rethrow(error);
    loadError = formatEntryLoadError(error);
    console.error("Failed to load budget page:", error);
  }

  if (loadError || !budgetProps) {
    return (
      <main className="pb-6">
        <div className="px-5 pt-5 pb-4">
          <DataLoadErrorBanner
            title="Impossibile caricare il budget"
            message={loadError ?? "Workspace non disponibile. Riprova tra poco."}
          />
        </div>
      </main>
    );
  }

  const { management, ...craftedProps } = budgetProps;

  return (
    <CraftedBudgetPage
      {...craftedProps}
      managementSection={
        <CraftedBudgetManagement
          embedded
          initialBudgets={management.budgets}
          categories={management.categories}
          currency={management.currency}
          alertSelection={management.alertSelection}
        />
      }
    />
  );
}
