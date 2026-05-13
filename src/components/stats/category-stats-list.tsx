import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/src/lib/formatters";
import { getCategoryEmoji } from "@/src/lib/visual-cues";

type CategoryStatsListProps = {
  categories: Array<{
    categoryId: string;
    categoryName: string;
    categorySlug: string;
    totalRealSpent: number;
    totalAlternativeCost: number;
    totalSaved: number;
    entriesCount: number;
    averageSaved: number;
  }>;
};

export function CategoryStatsList({ categories }: CategoryStatsListProps) {
  return (
    <Card className="overflow-hidden border-border/60 bg-surface/85 shadow-none ring-1 ring-white/5">
      <CardHeader className="space-y-1.5 p-4 pb-0 sm:p-5">
        <CardTitle className="text-base font-semibold tracking-tight text-foreground">
          Dove stai salvando di più
        </CardTitle>
        <p className="text-sm leading-6 text-muted-text">
          Le categorie che ti stanno lasciando più soldi in tasca.
        </p>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        {categories.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/70 bg-surface-muted/60 p-5 text-sm leading-6 text-muted-text">
            Nessun dato per categoria ancora disponibile.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="hidden grid-cols-5 gap-3 px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-text md:grid">
              <div>Categoria</div>
              <div>Risparmiato</div>
              <div>Speso</div>
              <div>Avresti speso</div>
              <div className="text-right">Movimenti</div>
            </div>

            {categories.map((category) => (
              <div
                key={category.categoryId}
                className="grid gap-3 rounded-3xl border border-border/60 bg-surface-muted/70 p-4 md:grid-cols-5 md:items-center"
              >
                <div className="space-y-1">
                  <p className="font-semibold tracking-tight text-foreground">
                    <span aria-hidden="true">
                      {getCategoryEmoji({
                        name: category.categoryName,
                        slug: category.categorySlug,
                      })}
                    </span>{" "}
                    {category.categoryName}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-text md:hidden">
                    Risparmiato
                  </p>
                  <p className="font-semibold text-success">
                    {formatMoney(category.totalSaved)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-text md:hidden">
                    Speso
                  </p>
                  <p className="font-medium text-foreground">
                    {formatMoney(category.totalRealSpent)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-text md:hidden">
                    Avresti speso
                  </p>
                  <p className="font-medium text-foreground">
                    {formatMoney(category.totalAlternativeCost)}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 md:justify-end">
                  <div className="space-y-1 md:text-right">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-text md:hidden">
                      Movimenti
                    </p>
                    <p className="font-semibold text-foreground">
                      {category.entriesCount}
                    </p>
                  </div>
                  <Badge variant="secondary" className="rounded-full">
                    Media {formatMoney(category.averageSaved)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
