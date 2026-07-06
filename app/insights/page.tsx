import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";

import {
  getInsightsPageData,
  type InsightsRangeDays,
} from "@/src/actions/insights";
import { CraftedInsights } from "@/src/components/insights/crafted-insights";
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";
import { formatEntryLoadError } from "@/src/lib/entry-load-debug";
import { getCurrentWorkspaceCurrency } from "@/src/lib/workspace-context";
import { getCurrencySymbol } from "@/src/lib/workspace-currency";

export const metadata: Metadata = {
  title: "Pattern · Non l'ho comprato",
};

type InsightsPageProps = {
  searchParams: Promise<{
    range?: string | string[];
  }>;
};

function parseInsightsRange(value?: string | string[]): InsightsRangeDays {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);

  return parsed === 30 || parsed === 90 || parsed === 365 ? parsed : 90;
}

export default async function InsightsPage({ searchParams }: InsightsPageProps) {
  const resolvedSearchParams = await searchParams;
  const rangeDays = parseInsightsRange(resolvedSearchParams.range);
  const currency = await getCurrentWorkspaceCurrency();
  const currencySymbol = getCurrencySymbol(currency);
  let data: Awaited<ReturnType<typeof getInsightsPageData>> | null = null;
  let loadError: string | null = null;

  try {
    data = await getInsightsPageData(rangeDays);
  } catch (error) {
    unstable_rethrow(error);
    loadError = formatEntryLoadError(error);
    console.error("Failed to load insights:", error);
  }

  return (
    <main className="pb-6">
      {loadError ? (
        <div className="px-5 pb-4">
          <DataLoadErrorBanner
            title="Impossibile caricare i pattern"
            message={loadError}
          />
        </div>
      ) : null}

      {data ? (
        <CraftedInsights data={data} currencySymbol={currencySymbol} />
      ) : null}
    </main>
  );
}
