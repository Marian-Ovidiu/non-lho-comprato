"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Label, Serif } from "@/components/crafted";
import { useTranslations } from "@/src/components/language/language-context";

export function CraftedEntryNotFound() {
  const t = useTranslations();
  return (
    <section className="-mx-4 px-5 py-10 text-center sm:-mx-6 lg:-mx-8">
      <Serif className="text-[22px] text-muted-foreground">{t.entryNotFound.title}</Serif>
      <p className="mx-auto mt-3 max-w-sm text-sm text-ink-3">
        {t.entryNotFound.desc}
      </p>
      <Link
        href="/entries"
        className="mt-6 inline-flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-accent px-6 text-[15.5px] font-bold text-accent-foreground"
      >
        {t.entryNotFound.backButton}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
      <Label className="mt-4 block">{t.entryNotFound.checkList}</Label>
    </section>
  );
}
