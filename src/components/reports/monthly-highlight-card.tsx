import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/src/lib/formatters";
import { getEntryOwnershipLabel } from "@/src/lib/person-labels";

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
    <div className="rounded-2xl border border-border bg-surface-muted p-4 dark:border-border dark:bg-surface-muted">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-text dark:text-muted-text">
        {title}
      </p>
      <p className="mt-1 text-lg font-semibold text-foreground dark:text-foreground">
        {value}
      </p>
      <p className="mt-1 text-sm text-muted-text dark:text-muted-text">
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
    <Card className="border-border shadow-sm dark:border-border">
      <CardHeader className="space-y-1 p-5 pb-3">
        <CardTitle className="text-base text-foreground dark:text-foreground">
          Evidenze del mese
        </CardTitle>
        <p className="text-sm text-muted-text dark:text-muted-text">
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

          <div className="rounded-2xl border border-success/20 bg-success/10 p-4 dark:border-success/30 dark:bg-success/15">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.16em] text-success dark:text-success/90">
                Schivata più forte
              </p>
              {biggestSaving ? (
                <Badge variant="secondary" className="bg-surface/80">
                  {getEntryOwnershipLabel(biggestSaving.person)}
                </Badge>
              ) : null}
            </div>

            <p className="mt-2 text-lg font-semibold text-foreground dark:text-foreground">
              {biggestSaving?.title ?? "Nessuna schivata da mostrare"}
            </p>

            <p className="mt-1 text-sm text-success dark:text-success/90">
              {biggestSaving
                ? `${formatMoney(biggestSaving.savedAmount)} risparmiati`
                : "Nessun risparmio rilevante registrato."}
            </p>

            {biggestSaving ? (
              <p className="mt-1 text-sm text-muted-text dark:text-muted-text">
                {biggestSaving.categoryName} â€¢ {formatDate(biggestSaving.date)}
              </p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


