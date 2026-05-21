import Link from "next/link";
import { BarChart3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/src/components/shared/empty-state";

type StatsEmptyStateProps = {
  title?: string;
  description?: string;
  note?: string;
  actionLabel?: string;
};

export function StatsEmptyState({
  title = "Ancora nessun dato",
  description = "Aggiungi i primi movimenti e qui compariranno le direzioni più utili.",
  note = "Bastano pochi dati per iniziare a leggere il mese.",
  actionLabel = "Aggiungi movimento",
}: StatsEmptyStateProps = {}) {
  return (
    <EmptyState
      title={title}
      description={description}
      note={note}
      icon={<BarChart3 className="size-5" aria-hidden="true" />}
      action={
        <Button asChild className="w-full sm:w-auto">
          <Link href="/entries/new">{actionLabel}</Link>
        </Button>
      }
    />
  );
}
