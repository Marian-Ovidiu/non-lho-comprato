"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { Label, Serif } from "@/components/crafted";
import { useTranslations } from "@/src/components/language/language-context";

type CraftedSubpageHeaderProps = {
  backHref: string;
  backLabel?: string;
  eyebrow?: string;
  title: string;
  context?: string;
  meta?: React.ReactNode;
};

export function CraftedSubpageHeader({
  backHref,
  backLabel,
  eyebrow,
  title,
  context,
  meta,
}: CraftedSubpageHeaderProps) {
  const t = useTranslations();
  const resolvedBackLabel = backLabel ?? t.subpageHeader.back;
  return (
    <section className="-mx-4 px-5 py-6 sm:-mx-6 lg:-mx-8">
      <Link
        href={backHref}
        className="mb-5 inline-flex items-center gap-1 text-sm text-ink-3 transition-opacity hover:opacity-80"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        {resolvedBackLabel}
      </Link>
      {eyebrow ? <Label className="mb-2 block">{eyebrow}</Label> : null}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-[clamp(1.75rem,8vw,2.25rem)] font-semibold tracking-[-0.03em]">
          {title}
        </h1>
        {meta}
      </div>
      {context ? (
        <Serif className="mt-3 block max-w-lg text-sm leading-6 text-muted-foreground">
          {context}
        </Serif>
      ) : null}
    </section>
  );
}
