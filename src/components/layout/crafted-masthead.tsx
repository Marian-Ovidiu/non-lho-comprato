"use client";

import { CraftedIcon, Mono } from "@/components/crafted";
import { useWorkspaceLanguage } from "@/src/components/language/language-context";
import { languageToLocale } from "@/src/lib/i18n";

function MastheadDate() {
  const language = useWorkspaceLanguage();
  const formatted = new Intl.DateTimeFormat(languageToLocale(language), {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Rome",
  }).format(new Date());

  const parts = formatted.replace(".", "").split(" ");
  const label =
    parts.length >= 3 ? `${parts[0]} · ${parts[1]} ${parts[2]}` : formatted;

  return (
    <Mono className="text-[11px] uppercase tracking-[0.14em] text-ink-3">
      {label}
    </Mono>
  );
}

type CraftedMastheadProps = {
  trailing?: React.ReactNode;
};

export function CraftedMasthead({ trailing }: CraftedMastheadProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pb-3.5 pt-[calc(env(safe-area-inset-top)+0.375rem)]">
      <MastheadDate />
      <div className="flex min-w-0 items-center gap-2">
        {trailing}
        <div className="flex shrink-0 items-center gap-1.5">
          <CraftedIcon name="flame" size={15} className="text-accent" />
          <span className="text-xs font-semibold text-muted-foreground">
            Non l&apos;ho comprato
          </span>
        </div>
      </div>
    </div>
  );
}
