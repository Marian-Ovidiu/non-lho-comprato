"use client";

import { LoginPanel } from "@/src/components/auth/login-panel";
import { InstallButton } from "@/src/components/pwa/install-button";
import { TrustCopy } from "@/src/components/shared/trust-copy";

const steps = [
  "Registra una spesa",
  "Aggiungi il confronto solo quando serve",
  "Vedi spesa e impatto netto insieme",
] as const;

const benefitCards = [
  {
    title: "Spese chiare",
    description: "Capisci subito dove va il tuo denaro.",
  },
  {
    title: "Impatto chiaro",
    description: "Non comprato e confronti restano separati dalla spesa reale.",
  },
  {
    title: "Obiettivi utili",
    description: "L'impatto positivo può alimentare le tue mete.",
  },
] as const;

export function PublicLanding() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      {/* Hero */}
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(21rem,0.98fr)] lg:items-center lg:gap-10">
        <div className="space-y-6 sm:space-y-7">
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
            Non l&apos;ho comprato
          </p>

          <div className="space-y-3">
            <p className="font-serif italic text-[18px] leading-none text-muted-foreground sm:text-[20px]">
              prima le spese,
            </p>
            <h1
              className="font-bold leading-[0.95] tracking-[-0.045em] text-foreground"
              style={{ fontSize: "clamp(52px, 9vw, 80px)" }}
            >
              poi l&apos;impatto
              <br />
              <span className="text-accent">resta visibile.</span>
            </h1>
          </div>

          <p className="max-w-xl text-[16px] leading-7 text-muted-foreground">
            Registra quello che spendi ogni giorno. Se un acquisto viene evitato o
            confrontato, l&apos;impatto netto resta chiaro senza spostare il focus.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <LoginPanel compact providers={["google"]} className="w-full sm:max-w-sm" />
            <div className="flex items-center justify-start pt-0.5">
              <InstallButton
                compact
                className="border-border/70 bg-surface/35 text-muted-foreground hover:bg-surface/60 hover:text-foreground"
              />
            </div>
          </div>

          <TrustCopy
            className="text-[11px] tracking-[0.05em]"
            style={{ color: "var(--text-3)" }}
          />
        </div>

        {/* Mock dashboard card */}
        <div className="overflow-hidden rounded-[22px] border border-border bg-surface p-4 shadow-sm sm:p-5 lg:p-6">
          <div className="overflow-hidden rounded-[18px] border border-border bg-background p-5 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.65)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  Speso questo mese
                </p>
                <p className="font-num text-[48px] font-bold leading-none tracking-[-0.05em] text-accent sm:text-[56px]">
                  247
                  <span className="text-[28px] font-medium text-muted-foreground">€</span>
                </p>
              </div>
              <div className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[11px] font-semibold text-accent">
                +18% impatto netto
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              {[
                { label: "Spese registrate", sub: "questo mese", value: "18" },
                { label: "Acquisti evitati", sub: "quando serve", value: "6" },
                { label: "Confronti aggiunti", sub: "solo se utili", value: "4" },
              ].map(({ label, sub, value }) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-[14px] border border-border bg-surface-muted px-4 py-3"
                >
                  <div>
                    <p className="text-[14px] font-medium text-foreground">{label}</p>
                    <p className="text-[11px] text-muted-foreground">{sub}</p>
                  </div>
                  <p className="font-num text-[20px] font-semibold text-foreground">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[14px] border border-border bg-surface-muted px-4 py-3">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">Obiettivo del mese</span>
                <span className="font-num font-semibold text-foreground">320€</span>
              </div>
              <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-surface">
                <div className="h-2 w-[77%] rounded-full bg-accent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Come funziona */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Come funziona
          </p>
        </div>
        {steps.map((step, index) => (
          <div
            key={step}
            className="rounded-[14px] border border-border bg-surface p-5 sm:p-6"
          >
            <div className="flex items-center gap-3">
              <span className="font-num inline-flex size-8 items-center justify-center rounded-full border border-border bg-surface-muted text-[12px] font-semibold text-foreground">
                {index + 1}
              </span>
              <p className="text-[14px] font-medium text-foreground">{step}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Perché conta */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Perché conta
          </p>
        </div>
        {benefitCards.map(({ title, description }) => (
          <div
            key={title}
            className="rounded-[14px] border border-border bg-surface p-5 sm:p-6"
          >
            <p className="text-[14px] font-medium text-foreground">{title}</p>
            <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{description}</p>
          </div>
        ))}
      </section>

      {/* CTA bottom */}
      <section className="overflow-hidden rounded-[22px] border border-border bg-surface p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Inizia ora
            </p>
            <h2
              className="font-bold tracking-[-0.03em] text-foreground"
              style={{ fontSize: "clamp(24px, 4vw, 36px)" }}
            >
              Inizia a tracciare
              <br />
              spese e impatto.
            </h2>
            <p className="max-w-xl text-[14px] leading-6 text-muted-foreground">
              Il totale speso resta al centro. Non comprato e confronti entrano
              come impatto netto, quando ci sono.
            </p>
          </div>

          <LoginPanel compact providers={["google"]} className="w-full sm:w-auto sm:min-w-[260px]" />
        </div>
      </section>
    </main>
  );
}
