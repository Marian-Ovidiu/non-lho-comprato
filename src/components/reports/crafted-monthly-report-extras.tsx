"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Label, Rule, Serif, StatTrio } from "@/components/crafted";
import { useTranslations } from "@/src/components/language/language-context";

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
  const t = useTranslations();
  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      <section className="px-5 pt-6 pb-2">
        <Label>{t.report.streakSeriesLabel}</Label>
      </section>
      <StatTrio
        items={[
          { label: t.report.bestStreak, value: bestStreak },
          { label: t.report.currentStreak, value: currentStreak },
          { label: t.report.habitsOk, value: habitsCompleted },
        ]}
      />
      <div className="px-5 py-4 text-center">
        <Serif className="text-sm text-ink-3">
          {t.report.habitsSkipped(habitsSkipped)}
        </Serif>
      </div>
      <Rule />
    </div>
  );
}

export function CraftedMonthlyReportEmptyCta() {
  const t = useTranslations();
  return (
    <section className="px-5 py-6">
      <Link
        href="/entries/new"
        className="flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-accent text-[15.5px] font-bold text-accent-foreground"
      >
        {t.report.addEntry}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
