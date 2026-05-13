import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/src/components/shared/empty-state";

type DashboardEmptyStateProps = {
  title?: string;
  description?: string;
  note?: string;
  actionLabel?: string;
};

export function DashboardEmptyState({
  title = "Ancora nessun movimento",
  description = "Segna qui il primo risparmio e vedrai il quadro di oggi prendere forma.",
  note = "Bastano pochi secondi per partire.",
  actionLabel = "Aggiungi movimento",
}: DashboardEmptyStateProps = {}) {
  return (
    <EmptyState
      title={title}
      description={description}
      note={note}
      icon={<Sparkles className="size-5" aria-hidden="true" />}
      action={
        <Button asChild className="w-full sm:w-auto">
          <Link href="/entries/new">{actionLabel}</Link>
        </Button>
      }
    />
  );
}
