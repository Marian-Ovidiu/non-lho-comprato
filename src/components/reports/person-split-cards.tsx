import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/src/lib/formatters";

type PersonSummary = {
  totalSaved: number;
  entriesCount: number;
};

type PersonSplitCardsProps = {
  marian?: PersonSummary | null;
  martina?: PersonSummary | null;
  condivise?: PersonSummary | null;
};

function getPersonCardTone(index: number) {
  if (index === 2) {
    return "border-zinc-200/80 bg-zinc-50/70";
  }

  return "border-zinc-200/80 bg-white";
}

function PersonCard({
  label,
  summary,
  toneIndex,
}: {
  label: string;
  summary?: PersonSummary | null;
  toneIndex: number;
}) {
  return (
    <Card className={getPersonCardTone(toneIndex)}>
      <CardHeader className="space-y-2 p-5 pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-medium text-zinc-600">
            {label}
          </CardTitle>
          <Badge variant="secondary">
            {summary?.entriesCount ?? 0} movimenti
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-5 pt-0">
        <p className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {formatMoney(summary?.totalSaved ?? 0)}
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Risparmio attribuito alla persona selezionata.
        </p>
      </CardContent>
    </Card>
  );
}

export function PersonSplitCards({
  marian,
  martina,
  condivise,
}: PersonSplitCardsProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          Ripartizione per persona
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Quanto ha contribuito ciascuno al risparmio del mese.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <PersonCard label="Marian" summary={marian} toneIndex={0} />
        <PersonCard label="Martina" summary={martina} toneIndex={1} />
        <PersonCard label="Condivise" summary={condivise} toneIndex={2} />
      </div>
    </section>
  );
}
