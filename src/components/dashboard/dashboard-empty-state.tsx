import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/src/components/shared/empty-state";
import { WORKSPACE_EMPTY_ENTRIES_TITLE } from "@/src/components/shared/workspace-empty-entries-copy";

type DashboardEmptyStateProps = {
  title?: string;
  description?: string;
  note?: string;
  actionLabel?: string;
};

export function DashboardEmptyState({
  description = "Aggiungi un movimento per continuare il ritmo di oggi.",
  note = "Bastano pochi secondi per iniziare.",
  actionLabel = "Aggiungi movimento",
}: DashboardEmptyStateProps = {}) {
  return (
    <EmptyState
      title={WORKSPACE_EMPTY_ENTRIES_TITLE}
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
