"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { CraftedIcon, Serif } from "@/components/crafted";
import { useTranslations } from "@/src/components/language/language-context";

export function CraftedGoalsEmptyState() {
  const t = useTranslations();

  const goalIdeas = [
    { icon: "plane" as const, name: t.goalForm.ideaVacation, target: "900€" },
    { icon: "shield" as const, name: t.goalForm.ideaEmergency, target: "2.000€" },
    { icon: "bike" as const, name: t.goalForm.ideaBike, target: "600€" },
    { icon: "target" as const, name: t.goalForm.ideaCourse, target: "300€" },
  ];

  return (
    <section className="-mx-4 px-[var(--sp-page-x)] py-16 text-center sm:-mx-6 lg:-mx-8">
      <Serif className="text-[22px] leading-snug text-muted-foreground">
        {t.goals.desc}
      </Serif>

      <div className="mt-8 text-left">
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
        {t.goals.createFirst}
        <Plus className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
