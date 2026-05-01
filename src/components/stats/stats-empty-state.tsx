import Link from "next/link";
import { BarChart3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/src/components/shared/empty-state";

export function StatsEmptyState() {
  return (
    <EmptyState
      title="Ancora niente statistiche"
      description="Prima devi schivare qualche spesa, piccolo ninja del portafoglio."
      note="Appena inserisci i primi movimenti, qui inizieranno a comparire grafici e confronti."
      icon={<BarChart3 className="size-5" aria-hidden="true" />}
      action={
        <Button asChild className="w-full sm:w-auto">
          <Link href="/entries/new">Aggiungi movimento</Link>
        </Button>
      }
    />
  );
}
