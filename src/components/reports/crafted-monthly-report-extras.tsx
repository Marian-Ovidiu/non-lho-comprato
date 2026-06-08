import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Label, Rule, Serif, StatTrio } from "@/components/crafted";

type CraftedMonthlyReportExtrasProps = {
  bestStreak: number;
  currentStreak: number;
  habitsCompleted: number;
  habitsSkipped: number;
};

export function CraftedMonthlyReportExtras({
  bestStreak,
  currentStreak,
  habitsCompleted,
  habitsSkipped,
}: CraftedMonthlyReportExtrasProps) {
  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      <section className="px-5 pt-6 pb-2">
        <Label>Serie nel mese</Label>
      </section>
      <StatTrio
        items={[
          { label: "Miglior streak", value: bestStreak },
          { label: "Streak attuale", value: currentStreak },
          {
            label: "Abitudini ok",
            value: habitsCompleted,
          },
        ]}
      />
      <div className="px-5 py-4 text-center">
        <Serif className="text-sm text-ink-3">
          {habitsSkipped} abitudini saltate nel mese.
        </Serif>
      </div>
      <Rule />
    </div>
  );
}

export function CraftedMonthlyReportEmptyCta() {
  return (
    <section className="px-5 py-6">
      <Link
        href="/entries/new"
        className="flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-accent text-[15.5px] font-bold text-accent-foreground"
      >
        Aggiungi movimento
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
