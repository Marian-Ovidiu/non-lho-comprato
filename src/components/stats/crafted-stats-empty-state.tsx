import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Label, Serif } from "@/components/crafted";

export function CraftedStatsEmptyState() {
  return (
    <section className="-mx-4 px-5 py-10 text-center sm:-mx-6 lg:-mx-8">
      <Serif className="text-[22px] leading-snug text-muted-foreground">
        Ancora nessun dato.
      </Serif>
      <p className="mx-auto mt-3 max-w-sm text-sm text-ink-3">
        Aggiungi i primi movimenti e qui compariranno le tendenze del mese.
      </p>
      <Link
        href="/entries/new"
        className="mt-6 inline-flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-accent px-6 text-[15.5px] font-bold text-accent-foreground transition-opacity hover:opacity-90"
      >
        Aggiungi il primo movimento
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
      <Label className="mt-4 block">Bastano pochi segnali per iniziare.</Label>
    </section>
  );
}
