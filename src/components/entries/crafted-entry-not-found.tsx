import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Label, Serif } from "@/components/crafted";

export function CraftedEntryNotFound() {
  return (
    <section className="-mx-4 px-5 py-10 text-center sm:-mx-6 lg:-mx-8">
      <Serif className="text-[22px] text-muted-foreground">Movimento non trovato.</Serif>
      <p className="mx-auto mt-3 max-w-sm text-sm text-ink-3">
        Il movimento potrebbe essere stato eliminato oppure l&apos;indirizzo non è più valido.
      </p>
      <Link
        href="/entries"
        className="mt-6 inline-flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-accent px-6 text-[15.5px] font-bold text-accent-foreground"
      >
        Torna ai movimenti
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
      <Label className="mt-4 block">Controlla l&apos;elenco movimenti.</Label>
    </section>
  );
}
