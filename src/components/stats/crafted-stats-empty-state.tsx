"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Label, Serif } from "@/components/crafted";
import { useTranslations } from "@/src/components/language/language-context";

export function CraftedStatsEmptyState() {
  const t = useTranslations();

  return (
    <section className="-mx-4 px-[var(--sp-page-x)] py-16 text-center sm:-mx-6 lg:-mx-8">
      <Serif className="text-[22px] leading-snug text-muted-foreground">
        {t.statsEmpty.title}
      </Serif>
      <p className="mx-auto mt-3 max-w-sm text-sm text-ink-3">
        {t.statsEmpty.desc}
      </p>
      <Link
        href="/entries/new"
        className="mt-6 inline-flex h-[54px] items-center justify-center gap-2 rounded-[var(--r-cta)] bg-accent px-6 text-[15.5px] font-bold text-accent-foreground transition-opacity hover:opacity-90"
      >
        {t.statsEmpty.action}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
      <Label className="mt-4 block">{t.statsEmpty.hint}</Label>
    </section>
  );
}
