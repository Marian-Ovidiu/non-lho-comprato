import Link from "next/link";
import { BarChart3, CircleOff, Layers3, PlusCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const actions = [
  {
    href: "/entries/new",
    title: "Registra una spesa",
    description: "Aggiungi movimento o confronto",
    icon: PlusCircle,
  },
  {
    href: "/entries/new?mode=avoided&savingContext=comparison",
    title: "Non l'ho comprato",
    description: "Segna una spesa evitata",
    icon: CircleOff,
  },
  {
    href: "/presets",
    title: "Preset rapidi",
    description: "Riusa spese e scorciatoie",
    icon: Layers3,
  },
  {
    href: "/stats",
    title: "Statistiche",
    description: "Guarda spesa e impatto netto",
    icon: BarChart3,
  },
] as const;

export function DashboardQuickActions() {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Azioni rapide</h2>
        <p className="text-sm text-muted-text">
          Parti da una spesa normale, poi aggiungi confronto o non comprato solo quando serve.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                "group flex min-h-24 flex-col justify-between rounded-3xl border border-border bg-surface p-4 shadow-sm transition-colors",
                "hover:border-border/80 hover:bg-surface-muted active:translate-y-px",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              )}
              aria-label={action.title}
            >
              <span className="flex size-10 items-center justify-center rounded-2xl bg-accent text-background transition-colors group-hover:bg-foreground group-hover:text-background dark:bg-surface-muted dark:text-foreground">
                <Icon className="size-5" aria-hidden="true" />
              </span>

              <span className="space-y-1">
                <span className="block text-sm font-semibold text-foreground">
                  {action.title}
                </span>
                <span className="block text-xs leading-5 text-muted-text">
                  {action.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
