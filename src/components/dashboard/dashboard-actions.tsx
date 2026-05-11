import Link from "next/link";
import { BarChart3, CalendarCheck2, Layers3, PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

const actions = [
  {
    href: "/entries/new",
    label: "Nuovo movimento",
    description: "Registra subito una spesa evitata.",
    icon: PlusCircle,
  },
  {
    href: "/presets",
    label: "Preset rapidi",
    description: "Riusa una spesa già pronta.",
    icon: Layers3,
  },
  {
    href: "/habits",
    label: "Abitudini di oggi",
    description: "Controlla cosa resta in attesa.",
    icon: CalendarCheck2,
  },
  {
    href: "/stats",
    label: "Statistiche",
    description: "Apri i grafici e i riepiloghi.",
    icon: BarChart3,
  },
] as const;

export function DashboardActions() {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          Cosa fare adesso
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Le scorciatoie più utili nella giornata.
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
              className="h-auto min-h-24 w-full min-w-0 justify-start overflow-hidden rounded-2xl border-zinc-200 bg-white p-4 text-left shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <Link
                href={action.href}
                className="flex w-full min-w-0 items-start gap-3"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="break-words text-sm font-semibold text-zinc-950 sm:text-[15px] dark:text-zinc-50">
                    {action.label}
                  </p>
                  <p className="break-words text-sm font-normal leading-5 text-zinc-500 dark:text-zinc-400">
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
