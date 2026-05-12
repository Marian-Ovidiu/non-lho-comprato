import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/src/components/shared/empty-state";

export function DashboardEmptyState() {
  return (
    <EmptyState
      title="Ancora nessun movimento"
      description="Segna qui il primo risparmio e inizia a vedere il totale crescere."
      note="Bastano pochi secondi per partire."
      icon={<Sparkles className="size-5" aria-hidden="true" />}
      action={
        <Button asChild className="w-full sm:w-auto">
          <Link href="/entries/new">Aggiungi movimento</Link>
        </Button>
      }
    />
  );
}
