import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/src/lib/formatters";

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
    <Card className="overflow-hidden border-zinc-200/80 shadow-sm">
      <CardHeader className="space-y-2 p-5 pb-0 sm:p-6">
        <CardTitle>Categorie</CardTitle>
        <p className="text-sm text-zinc-500">
          Riepilogo completo di quello che hai risparmiato per categoria.
        </p>
      </CardHeader>
      <CardContent className="p-5 sm:p-6">
        {categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-500">
            Nessun dato per categoria ancora disponibile.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="hidden grid-cols-5 gap-3 px-3 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500 md:grid">
              <div>Categoria</div>
              <div>Risparmiato</div>
              <div>Speso</div>
              <div>Avresti speso</div>
              <div className="text-right">Movimenti</div>
            </div>

            {categories.map((category) => (
              <div
                key={category.categoryId}
                className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 md:grid-cols-5 md:items-center"
              >
                <div className="space-y-1">
                  <p className="font-semibold text-zinc-950">
                    {category.categoryName}
                  </p>
                  <p className="text-xs text-zinc-500">{category.categorySlug}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500 md:hidden">
                    Risparmiato
                  </p>
                  <p className="font-semibold text-emerald-700">
                    {formatMoney(category.totalSaved)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500 md:hidden">
                    Speso
                  </p>
                  <p className="font-medium text-zinc-950">
                    {formatMoney(category.totalRealSpent)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500 md:hidden">
                    Avresti speso
                  </p>
                  <p className="font-medium text-zinc-950">
                    {formatMoney(category.totalAlternativeCost)}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 md:justify-end">
                  <div className="space-y-1 md:text-right">
                    <p className="text-xs uppercase tracking-[0.16em] text-zinc-500 md:hidden">
                      Movimenti
                    </p>
                    <p className="font-semibold text-zinc-950">
                      {category.entriesCount}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    Medio {formatMoney(category.averageSaved)}
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
