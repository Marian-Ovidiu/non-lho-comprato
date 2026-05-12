"use client";

import { Target, TrendingUp, Users } from "lucide-react";

import { LoginPanel } from "@/src/components/auth/login-panel";
import { PwaInstallContent } from "@/src/components/pwa/install-button";

const landingBenefits = [
  {
    icon: TrendingUp,
    title: "Vedi quanto risparmi davvero",
    description:
      "Ogni rinuncia tracciata diventa un numero chiaro, non una sensazione.",
  },
  {
    icon: Users,
    title: "Condividi le spese in coppia",
    description:
      "Tieni allineato il quadro comune senza perdere il dettaglio dei singoli movimenti.",
  },
  {
    icon: Target,
    title: "Resta vicino ai tuoi obiettivi",
    description:
      "Trasforma il risparmio in un traguardo leggibile e semplice da seguire.",
  },
] as const;

export function PublicLanding() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:items-start lg:gap-10">
        <div className="space-y-6 sm:space-y-7">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-text">
            Non l&apos;ho comprato
          </p>

          <div className="space-y-4">
            <h1 className="max-w-xl font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Scopri quanto risparmi davvero.
            </h1>
            <p className="max-w-lg text-base leading-7 text-muted-text sm:text-lg">
              Ogni caffè evitato, delivery saltata o spesa intelligente diventa
              risparmio visibile.
            </p>
          </div>

          <div className="grid gap-4 sm:max-w-2xl sm:grid-cols-[minmax(0,1.05fr)_minmax(16rem,0.95fr)]">
            <LoginPanel compact providers={["google"]} />

            <div className="rounded-3xl border border-border/70 bg-surface/60 p-4 shadow-sm sm:p-5">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-text">
                  PWA
                </p>
                <p className="text-sm leading-6 text-foreground sm:text-[0.95rem]">
                  Aggiungi l&apos;app alla schermata Home per aprirla in un
                  gesto.
                </p>
              </div>

              <div className="mt-4">
                <PwaInstallContent />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border/70 bg-surface/60 p-5 shadow-sm sm:p-6">
          <div className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-text">
              In pratica
            </p>
            <p className="text-sm leading-6 text-foreground sm:text-[0.95rem]">
              Uno spazio pulito per vedere cosa hai evitato, cosa hai condiviso
              e dove stai andando.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-text">
          Tre cose subito chiare
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {landingBenefits.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-3xl border border-border/70 bg-surface/60 p-5 shadow-sm sm:p-6"
            >
              <Icon className="size-5 text-muted-text" aria-hidden="true" />
              <h2 className="mt-4 text-sm font-medium text-foreground sm:text-[0.95rem]">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-text sm:text-[0.95rem]">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
