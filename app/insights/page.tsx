import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";

import { getInsightsPageData, type InsightsData } from "@/src/actions/insights";
import { CraftedInsights } from "@/src/components/insights/crafted-insights";
import { CraftedSubpageHeader } from "@/src/components/layout/crafted-subpage-header";
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";
import { Rule } from "@/components/crafted";
import { formatEntryLoadError } from "@/src/lib/entry-load-debug";
import { getCurrentWorkspaceLanguage } from "@/src/lib/workspace-context";
import { getTranslations } from "@/src/lib/i18n";

export const metadata: Metadata = {
  title: "Cosa sta cambiando · Non l'ho comprato",
};

export default async function InsightsPage() {
  const language = await getCurrentWorkspaceLanguage();
  const t = getTranslations(language);

  let data: InsightsData | null = null;
  let loadError: string | null = null;

  try {
    data = await getInsightsPageData();
  } catch (error) {
    unstable_rethrow(error);
    loadError = formatEntryLoadError(error);
    console.error("Failed to load insights page:", error);
  }

  return (
    <main className="pb-6">
      <CraftedSubpageHeader
        backHref="/more"
        eyebrow={t.more.analyticsSection}
        title={t.insights.pageTitle}
        context={t.insights.pageContext}
      />

      <Rule />

      {loadError || !data ? (
        <div className="px-[var(--sp-page-x)] pt-5">
          <DataLoadErrorBanner
            title={t.insights.pageTitle}
            message={loadError ?? "Riprova tra poco."}
          />
        </div>
      ) : (
        <CraftedInsights data={data} />
      )}
    </main>
  );
}
