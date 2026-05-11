import Link from "next/link";
import { CalendarRange } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/src/components/shared/empty-state";

type MonthlyReportEmptyStateProps = {
  monthLabel: string;
};

export function MonthlyReportEmptyState({
  monthLabel,
}: MonthlyReportEmptyStateProps) {
  return (
    <EmptyState
      title={`Nessun dato per ${monthLabel.toLowerCase()}`}
      description="In questo mese non ci sono movimenti o abitudini registrate."
      note="Seleziona un altro mese oppure aggiungi qualche movimento per far partire il report."
      icon={<CalendarRange className="size-5" aria-hidden="true" />}
      action={
        <Button asChild className="w-full sm:w-auto">
          <Link href="/entries/new">Aggiungi movimento</Link>
        </Button>
      }
    />
  );
}
