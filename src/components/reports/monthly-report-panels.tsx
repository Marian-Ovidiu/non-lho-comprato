import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/src/lib/formatters";
import { StreakCard } from "@/src/components/streaks/streak-card";

import type { MonthlyReportData } from "@/src/actions/reports";

type MonthlyReportPanelsProps = {
  report: MonthlyReportData;
};

function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value)}%`;
}

function getCardTone(index: number) {
  return index === 0
    ? "border-emerald-200 bg-emerald-50/70"
    : "border-zinc-200/80 bg-white";
}

export function MonthlyReportPanels({ report }: MonthlyReportPanelsProps) {
  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-zinc-950">Panoramica mensile</h2>
          <p className="text-sm text-zinc-500">
            Il quadro completo del mese selezionato.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Risparmiato",
              value: formatMoney(report.overview.totalSaved),
              description: "Totale del mese.",
            },
            {
              label: "Speso davvero",
              value: formatMoney(report.overview.totalRealSpent),
              description: "Uscite effettive.",
            },
            {
              label: "Avresti speso",
              value: formatMoney(report.overview.totalAlternativeCost),
              description: "Scenario evitato.",
            },
            {
              label: "Movimenti",
              value: String(report.overview.entriesCount),
              description: "Voci registrate nel mese.",
            },
          ].map((card, index) => (
            <Card key={card.label} className={getCardTone(index)}>
              <CardHeader className="space-y-1 p-5 pb-3">
                <CardTitle className="text-sm font-medium text-zinc-600">
                  {card.label}
                </CardTitle>
                <p className="text-xs text-zinc-500">{card.description}</p>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <p className="text-3xl font-semibold tracking-tight text-zinc-950">
                  {card.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-zinc-950">
            Ripartizione per persona
          </h2>
          <p className="text-sm text-zinc-500">
            Quanto ha contribuito ciascuno al risparmio del mese.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {report.personSplit.map((item) => (
            <Card key={item.key} className="border-zinc-200/80 shadow-sm">
              <CardHeader className="space-y-2 p-5 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-sm font-medium text-zinc-600">
                    {item.label}
                  </CardTitle>
                  <Badge variant={item.key === "TOTAL" ? "default" : "secondary"}>
                    {formatPercent(item.sharePercent)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 p-5 pt-0">
                <p className="text-3xl font-semibold tracking-tight text-zinc-950">
                  {formatMoney(item.totalSaved)}
                </p>
                <p className="text-sm text-zinc-500">
                  {item.entriesCount} movimenti nel mese
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="border-zinc-200/80 shadow-sm">
          <CardHeader className="space-y-1 p-5 pb-3">
            <CardTitle className="text-base">Categoria migliore</CardTitle>
            <p className="text-sm text-zinc-500">
              La categoria che ha prodotto piu risparmio.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-0">
            {report.bestCategory ? (
              <>
                <p className="text-2xl font-semibold tracking-tight text-zinc-950">
                  {report.bestCategory.categoryName}
                </p>
                <p className="text-sm text-zinc-500">
                  {formatMoney(report.bestCategory.totalSaved)} risparmiati in{" "}
                  {report.bestCategory.entriesCount} movimenti.
                </p>
              </>
            ) : (
              <p className="text-sm text-zinc-500">
                Nessuna categoria disponibile per questo mese.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-200/80 shadow-sm">
          <CardHeader className="space-y-1 p-5 pb-3">
            <CardTitle className="text-base">Schivata piu forte</CardTitle>
            <p className="text-sm text-zinc-500">
              Il risparmio piu grande registrato nel mese.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-0">
            {report.biggestSaving ? (
              <>
                <p className="text-2xl font-semibold tracking-tight text-zinc-950">
                  {report.biggestSaving.title}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                  <span>{report.biggestSaving.categoryName}</span>
                  <span>•</span>
                  <span>{formatDate(report.biggestSaving.date)}</span>
                  <span>•</span>
                  <span>
                    {report.biggestSaving.person === "MARIAN"
                      ? "Marian"
                      : "Martina"}
                  </span>
                </div>
                <p className="text-sm font-medium text-emerald-700">
                  {formatMoney(report.biggestSaving.savedAmount)} risparmiati
                </p>
              </>
            ) : (
              <p className="text-sm text-zinc-500">
                Nessuna schivata da mostrare in questo mese.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="border-zinc-200/80 shadow-sm">
          <CardHeader className="space-y-1 p-5 pb-3">
            <CardTitle className="text-base">Abitudini</CardTitle>
            <p className="text-sm text-zinc-500">
              Quanto hanno pesato le abitudini nel mese.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 p-5 pt-0">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-2xl bg-zinc-50 px-3 py-2">
                <p className="text-zinc-500">Occorrenze</p>
                <p className="font-semibold text-zinc-950">
                  {report.habitSummary.totalOccurrences}
                </p>
              </div>
              <div className="rounded-2xl bg-zinc-50 px-3 py-2">
                <p className="text-zinc-500">Evitati</p>
                <p className="font-semibold text-zinc-950">
                  {report.habitSummary.avoidedCount}
                </p>
              </div>
              <div className="rounded-2xl bg-zinc-50 px-3 py-2">
                <p className="text-zinc-500">Spesi</p>
                <p className="font-semibold text-zinc-950">
                  {report.habitSummary.spentCount}
                </p>
              </div>
              <div className="rounded-2xl bg-zinc-50 px-3 py-2">
                <p className="text-zinc-500">Saltati</p>
                <p className="font-semibold text-zinc-950">
                  {report.habitSummary.skippedCount}
                </p>
              </div>
              <div className="rounded-2xl bg-zinc-50 px-3 py-2">
                <p className="text-zinc-500">In attesa</p>
                <p className="font-semibold text-zinc-950">
                  {report.habitSummary.pendingCount}
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-3 py-2">
                <p className="text-emerald-700">Risparmiato</p>
                <p className="font-semibold text-emerald-700">
                  {formatMoney(report.habitSummary.totalSaved)}
                </p>
              </div>
            </div>

            <p className="text-sm text-zinc-500">
              Tasso disciplina: {formatPercent(report.habitSummary.disciplineRatePercent)}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <StreakCard
            title="Serie del mese"
            currentStreak={report.streakSummary.currentStreak}
            bestStreak={report.streakSummary.bestStreak}
          />

          <Card className="border-zinc-200/80 shadow-sm">
            <CardHeader className="space-y-1 p-5 pb-3">
              <CardTitle className="text-base">Recap</CardTitle>
              <p className="text-sm text-zinc-500">
                Un testo pronto da leggere o condividere.
              </p>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <p className="text-sm leading-7 text-zinc-700">{report.recap}</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
