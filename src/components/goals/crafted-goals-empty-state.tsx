import Link from "next/link";
import { Plus } from "lucide-react";

import { CraftedIcon, Label, Serif } from "@/components/crafted";

const goalIdeas = [
  { icon: "plane" as const, name: "Vacanza", target: "900€" },
  { icon: "shield" as const, name: "Emergenza", target: "2.000€" },
  { icon: "bike" as const, name: "Bici", target: "600€" },
  { icon: "target" as const, name: "Corso", target: "300€" },
];

export function CraftedGoalsEmptyState() {
  return (
    <section className="-mx-4 px-[var(--sp-page-x)] py-16 text-center sm:-mx-6 lg:-mx-8">
      <Serif className="text-[22px] leading-snug text-muted-foreground">
        Un obiettivo dà direzione a quello che tieni.
      </Serif>
      <p className="mx-auto mt-3 max-w-sm text-sm text-ink-3">
        Una vacanza, un fondo emergenza, un acquisto importante. Ogni movimento ci si avvicina
        un po&apos;.
      </p>

      <div className="mt-8 text-left">
        <Label className="mb-3 block">Idee per iniziare</Label>
        <div className="grid grid-cols-2 gap-3">
          {goalIdeas.map((idea) => (
            <div key={idea.name} className="border-y border-line py-3">
              <CraftedIcon name={idea.icon} size={20} className="mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">{idea.name}</p>
              <p className="font-num mt-0.5 text-xs text-ink-3">{idea.target}</p>
            </div>
          ))}
        </div>
      </div>

      <Link
        href="#nuovo-obiettivo"
        className="mt-6 inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-[var(--r-cta)] bg-accent text-[15.5px] font-bold text-accent-foreground transition-opacity hover:opacity-90"
      >
        Crea il primo obiettivo
        <Plus className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
