import Link from "next/link";
import { Plus } from "lucide-react";

import { CraftedIcon, Label, Serif } from "@/components/crafted";

const habitIdeas = [
  { icon: "coffee" as const, name: "Caffè al bar", amount: "4€" },
  { icon: "cig" as const, name: "Sigarette", amount: "6€" },
  { icon: "glass" as const, name: "Aperitivo", amount: "12€" },
  { icon: "fork" as const, name: "Delivery", amount: "15€" },
];

export function CraftedHabitsEmptyState() {
  return (
    <section className="-mx-4 px-[var(--sp-page-x)] py-16 text-center sm:-mx-6 lg:-mx-8">
      <Serif className="text-[22px] leading-snug text-muted-foreground">
        Le abitudini tengono il ritmo.
      </Serif>
      <p className="mx-auto mt-3 max-w-sm text-sm text-ink-3">
        Segna ogni giorno cosa eviti e cosa no. Col tempo diventa un reflesso.
      </p>

      <div className="mt-8 text-left">
        <Label className="mb-3 block">Esempi</Label>
        <div className="grid grid-cols-2 gap-3">
          {habitIdeas.map((idea) => (
            <div key={idea.name} className="border-y border-line py-3">
              <CraftedIcon name={idea.icon} size={20} className="mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">{idea.name}</p>
              <p className="font-num mt-0.5 text-xs text-ink-3">{idea.amount}</p>
            </div>
          ))}
        </div>
      </div>

      <Link
        href="#nuova-abitudine"
        className="mt-6 inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-[var(--r-cta)] bg-accent text-[15.5px] font-bold text-accent-foreground transition-opacity hover:opacity-90"
      >
        Crea la prima abitudine
        <Plus className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
