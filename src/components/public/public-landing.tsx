"use client";

import { Coffee, Target, TrendingUp } from "lucide-react";

import { LoginPanel } from "@/src/components/auth/login-panel";
import { InstallButton } from "@/src/components/pwa/install-button";

const savingsExamples = [
  { label: "caffè evitati", value: "18", icon: Coffee },
  { label: "delivery saltate", value: "6", icon: TrendingUp },
  { label: "acquisti evitati", value: "4", icon: Target },
] as const;

const benefitCards = [
  {
    title: "Più consapevolezza",
    description: "Capisci dove spariscono davvero i soldi.",
  },
  {
    title: "Obiettivi condivisi",
    description: "Perfetto per coppie e spese condivise.",
  },
  {
    title: "Motivazione reale",
    description: "Vedere crescere il totale ti fa continuare.",
  },
] as const;

const steps = [
  "Segna ciò che non hai comprato",
  "L'app calcola il risparmio reale",
  "Guarda crescere i risultati",
] as const;

export function PublicLanding() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(21rem,0.98fr)] lg:items-center lg:gap-10">
        <div className="space-y-6 sm:space-y-7">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-text">
            Non l&apos;ho comprato
          </p>

          <div className="space-y-4">
            <h1 className="max-w-2xl font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Scopri quanto risparmi davvero.
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-text sm:text-lg">
              Segna il caffè saltato, la delivery evitata o l&apos;acquisto
              rimandato. Vedrai il risparmio reale crescere in euro, non in
              sensazioni.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <LoginPanel compact providers={["google"]} className="w-full sm:max-w-sm" />
            <div className="flex items-center justify-start pt-0.5">
              <InstallButton
                compact
                className="border-border/70 bg-surface/35 text-muted-text hover:bg-surface/60 hover:text-foreground"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-border/70 bg-surface/50 px-3 py-1 text-xs text-muted-text">
              Caffè evitati
            </span>
            <span className="rounded-full border border-border/70 bg-surface/50 px-3 py-1 text-xs text-muted-text">
              Delivery saltate
            </span>
            <span className="rounded-full border border-border/70 bg-surface/50 px-3 py-1 text-xs text-muted-text">
              Risparmio reale
            </span>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/70 bg-surface/70 p-4 shadow-sm sm:p-5 lg:p-6">
          <div className="rounded-[1.5rem] border border-border/70 bg-background/70 p-5 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.65)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-text">
                  Risparmiato questo mese
                </p>
                <p className="font-heading text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
                  247€
                </p>
              </div>
              <div className="rounded-full border border-border/70 bg-surface/70 px-3 py-1 text-xs text-muted-text">
                +18% vs mese scorso
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="grid gap-3">
                {savingsExamples.map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-2xl border border-border/70 bg-surface/55 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-9 items-center justify-center rounded-full border border-border/70 bg-background/60">
                        <Icon className="size-4 text-muted-text" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {label}
                        </p>
                        <p className="text-xs text-muted-text">Stimato nel mese</p>
                      </div>
                    </div>
                    <p className="font-heading text-xl font-semibold text-foreground">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border/70 bg-surface/45 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-text">Obiettivo mensile</span>
                <span className="font-medium text-foreground">320€</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-surface-muted">
                <div className="h-2 w-[77%] rounded-full bg-foreground" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-3">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-text">
            Come funziona
          </p>
        </div>
        {steps.map((step, index) => (
          <div
            key={step}
            className="rounded-3xl border border-border/70 bg-surface/60 p-5 shadow-sm sm:p-6"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex size-8 items-center justify-center rounded-full border border-border/70 bg-background/70 text-xs font-medium text-foreground">
                {index + 1}
              </span>
              <p className="text-sm font-medium text-foreground">{step}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-3">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-text">
            Perché conta
          </p>
        </div>
        {benefitCards.map(({ title, description }) => (
          <div
            key={title}
            className="rounded-3xl border border-border/70 bg-surface/60 p-5 shadow-sm sm:p-6"
          >
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="mt-2 text-sm leading-6 text-muted-text">
              {description}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-[1.75rem] border border-border/70 bg-surface/60 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-text">
              Inizia ora
            </p>
            <h2 className="max-w-xl font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Inizia a vedere quanto risparmi davvero.
            </h2>
          </div>

          <div className="flex items-center">
            <LoginPanel compact providers={["google"]} className="w-full sm:w-auto" />
          </div>
        </div>
      </section>
    </main>
  );
}
