import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/src/lib/formatters";
import { getPersonFilterLabel } from "@/src/lib/person-labels";

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
    return "border-border bg-surface-muted";
  }

  return "border-border bg-surface";
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
          <CardTitle className="text-sm font-medium text-muted-text">
            {label}
          </CardTitle>
          <Badge variant="secondary">
            {summary?.entriesCount ?? 0} movimenti
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-5 pt-0">
        <p className="text-3xl font-semibold tracking-tight text-foreground dark:text-foreground">
          {formatMoney(summary?.totalSaved ?? 0)}
        </p>
        <p className="text-sm text-muted-text dark:text-muted-text">
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
        <h2 className="text-lg font-semibold text-foreground dark:text-foreground">
          Ripartizione per persona
        </h2>
        <p className="text-sm text-muted-text dark:text-muted-text">
          Quanto ha contribuito ciascuno al risparmio del mese.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <PersonCard
          label={getPersonFilterLabel("MARIAN")}
          summary={marian}
          toneIndex={0}
        />
        <PersonCard
          label={getPersonFilterLabel("MARTINA")}
          summary={martina}
          toneIndex={1}
        />
        <PersonCard
          label={getPersonFilterLabel("TUTTI")}
          summary={condivise}
          toneIndex={2}
        />
      </div>
    </section>
  );
}

