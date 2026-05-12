import Link from "next/link";
import { BarChart3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/src/components/shared/empty-state";

export function StatsEmptyState() {
  return (
    <EmptyState
      title="Ancora niente statistiche"
      description="📈 Aggiungi i primi movimenti e qui compariranno grafici e confronti."
      note="Bastano pochi dati per vedere i primi pattern."
      icon={<BarChart3 className="size-5" aria-hidden="true" />}
      action={
        <Button asChild className="w-full sm:w-auto">
          <Link href="/entries/new">Aggiungi movimento</Link>
        </Button>
      }
    />
  );
}
