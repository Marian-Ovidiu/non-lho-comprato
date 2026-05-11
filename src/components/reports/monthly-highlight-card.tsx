import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/src/lib/formatters";

type CategoryHighlight = {
  name: string;
  totalSaved?: number;
  totalRealSpent?: number;
  entriesCount?: number;
} | null;

type BiggestSaving = {
  title: string;
  savedAmount: number;
  date: string | Date;
  person: "MARIAN" | "MARTINA" | "TUTTI";
  categoryName: string;
} | null;

type MonthlyHighlightCardProps = {
  bestCategory?: CategoryHighlight;
  worstCategory?: CategoryHighlight;
  biggestSaving?: BiggestSaving;
};

function HighlightItem({
  title,
  description,
  value,
}: {
  title: string;
  description: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
        {title}
      </p>
      <p className="mt-1 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        {value}
      </p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {description}
      </p>
    </div>
  );
}

export function MonthlyHighlightCard({
  bestCategory,
  worstCategory,
  biggestSaving,
}: MonthlyHighlightCardProps) {
  return (
    <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
      <CardHeader className="space-y-1 p-5 pb-3">
        <CardTitle className="text-base text-zinc-950 dark:text-zinc-50">
          Evidenze del mese
        </CardTitle>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          I punti che hanno fatto la differenza.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0">
        <div className="grid gap-3">
          <HighlightItem
            title="Categoria migliore"
            value={bestCategory?.name ?? "Nessuna categoria"}
            description={
              bestCategory
                ? `${formatMoney(bestCategory.totalSaved ?? 0)} risparmiati`
                : "Nessun dato disponibile."
            }
          />

          <HighlightItem
            title="Categoria peggiore"
            value={worstCategory?.name ?? "Nessuna categoria"}
            description={
              worstCategory
                ? `${formatMoney(worstCategory.totalRealSpent ?? 0)} spesi davvero`
                : "Nessun dato disponibile."
            }
          />

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                Schivata più forte
              </p>
              {biggestSaving ? (
                <Badge variant="secondary" className="bg-white/80">
                  {biggestSaving.person === "MARIAN"
                    ? "Marian"
                    : biggestSaving.person === "MARTINA"
                      ? "Martina"
                      : "Condivise"}
                </Badge>
              ) : null}
            </div>

            <p className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              {biggestSaving?.title ?? "Nessuna schivata da mostrare"}
            </p>

            <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
              {biggestSaving
                ? `${formatMoney(biggestSaving.savedAmount)} risparmiati`
                : "Nessun risparmio rilevante registrato."}
            </p>

            {biggestSaving ? (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {biggestSaving.categoryName} • {formatDate(biggestSaving.date)}
              </p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
