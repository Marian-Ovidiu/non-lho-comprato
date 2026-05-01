import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/src/lib/formatters";

type SummaryCardsProps = {
  totalRealSpent: number;
  totalAlternativeCost: number;
  totalSaved: number;
  entriesCount: number;
};

const cards = [
  { key: "real", label: "Speso questo mese" },
  { key: "alternative", label: "Avresti speso" },
  { key: "saved", label: "Risparmiato" },
  { key: "count", label: "Movimenti" },
] as const;

export function SummaryCards({
  totalRealSpent,
  totalAlternativeCost,
  totalSaved,
  entriesCount,
}: SummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="overflow-hidden border-zinc-200/80">
        <CardHeader className="space-y-1 p-5 pb-3">
          <CardTitle className="text-sm font-medium text-zinc-600">
            {cards[0].label}
          </CardTitle>
          <p className="text-xs text-zinc-500">Somma delle spese registrate nel mese</p>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <p className="text-3xl font-semibold tracking-tight text-zinc-950">
            {formatMoney(totalRealSpent)}
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-zinc-200/80">
        <CardHeader className="space-y-1 p-5 pb-3">
          <CardTitle className="text-sm font-medium text-zinc-600">
            {cards[1].label}
          </CardTitle>
          <p className="text-xs text-zinc-500">
            Quello che avresti speso nell&apos;alternativa
          </p>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <p className="text-3xl font-semibold tracking-tight text-zinc-950">
            {formatMoney(totalAlternativeCost)}
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-emerald-200 bg-emerald-50/70 shadow-sm">
        <CardHeader className="space-y-1 p-5 pb-3">
          <CardTitle className="text-sm font-medium text-emerald-700">
            {cards[2].label}
          </CardTitle>
          <p className="text-xs text-emerald-700/80">
            Il numero che vogliamo far crescere
          </p>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <p className="text-3xl font-semibold tracking-tight text-emerald-700">
            {formatMoney(totalSaved)}
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-zinc-200/80">
        <CardHeader className="space-y-1 p-5 pb-3">
          <CardTitle className="text-sm font-medium text-zinc-600">
            {cards[3].label}
          </CardTitle>
          <p className="text-xs text-zinc-500">Tutti i movimenti del periodo</p>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <p className="text-3xl font-semibold tracking-tight text-zinc-950">
            {entriesCount}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
