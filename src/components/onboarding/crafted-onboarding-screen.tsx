"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CraftedIcon, Serif } from "@/components/crafted";

export function CraftedOnboardingScreen() {
  return (
    <main className="flex min-h-[100dvh] flex-col bg-background px-6 pb-8 pt-10">
      <div className="flex items-center gap-2">
        <CraftedIcon name="flame" size={18} className="text-accent" />
        <span className="text-[13px] font-semibold tracking-[0.02em] text-muted-foreground">
          Non l&apos;ho comprato
        </span>
      </div>

      <div className="mb-8 mt-auto">
        <CraftedIcon name="flame" size={40} className="mb-6 text-accent" aria-hidden="true" />
        <Serif className="text-[clamp(1.75rem,8vw,2.25rem)] leading-snug text-muted-foreground">
          La dashboard è pronta.
        </Serif>
        <p className="mt-5 max-w-[320px] text-base leading-relaxed text-ink-3">
          Parti dalle spese. Se qualcosa viene evitato o confrontato, l&apos;impatto
          netto si aggiorna da solo.
        </p>
      </div>

      <Link
        href="/?welcome=1"
        className="inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-accent text-[15.5px] font-bold text-accent-foreground transition-opacity hover:opacity-90"
      >
        Apri la dashboard
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>

      <div className="mt-6 flex justify-center gap-1.5" aria-hidden="true">
        <span className="size-1.5 rounded-full bg-accent/80" />
        <span className="size-1.5 rounded-full bg-accent/45" />
        <span className="size-1.5 rounded-full bg-accent/25" />
      </div>
    </main>
  );
}
