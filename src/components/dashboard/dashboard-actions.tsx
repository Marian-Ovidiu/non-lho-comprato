import Link from "next/link";
import { BarChart3, PlusCircle, Repeat2, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const actions = [
  {
    href: "/entries/new",
    label: "Aggiungi movimento",
    description: "Registra una spesa evitata in pochi secondi.",
    icon: PlusCircle,
  },
  {
    href: "/habits",
    label: "Vai alle abitudini",
    description: "Controlla le cose che tornano spesso.",
    icon: Repeat2,
  },
  {
    href: "/stats",
    label: "Vedi statistiche",
    description: "Apri grafici e riepiloghi dettagliati.",
    icon: BarChart3,
  },
  {
    href: "/goals",
    label: "Obiettivi",
    description: "Tieni d'occhio le mete dei risparmi.",
    icon: Target,
  },
] as const;

export function DashboardActions() {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-zinc-950">Azioni rapide</h2>
        <p className="text-sm text-zinc-500">
          Le scorciatoie più usate nella giornata.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Button
              key={action.href}
              asChild
              variant="outline"
              className="h-auto justify-start rounded-3xl border-zinc-200 bg-white p-4 text-left shadow-sm"
            >
              <Link href={action.href} className="flex w-full items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-zinc-950">
                    {action.label}
                  </p>
                  <p className="text-sm font-normal leading-5 text-zinc-500">
                    {action.description}
                  </p>
                </div>
              </Link>
            </Button>
          );
        })}
      </div>
    </section>
  );
}
