"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, List, PlusCircle, Repeat2, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InstallButton } from "@/src/components/pwa/install-button";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/entries/new", label: "Aggiungi", icon: PlusCircle },
  { href: "/entries", label: "Movimenti", icon: List },
  { href: "/goals", label: "Obiettivi", icon: Target },
  { href: "/stats", label: "Statistiche", icon: BarChart3 },
  { href: "/habits", label: "Abitudini", icon: Repeat2 },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                  Non l&apos;ho comprato
                </p>
                <h1 className="text-lg font-semibold tracking-tight text-zinc-950">
                  Schiva spese inutili, un movimento alla volta.
                </h1>
              </div>

              <div className="shrink-0">
                <InstallButton />
              </div>
            </div>

            <nav
              aria-label="Navigazione principale"
              className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]"
            >
              {navItems.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Button
                    key={item.href}
                    asChild
                    variant={active ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "min-w-fit shrink-0 justify-start gap-2 rounded-full px-4",
                      active
                        ? "bg-zinc-950 text-white hover:bg-zinc-900"
                        : "text-zinc-600 hover:text-zinc-950"
                    )}
                  >
                    <Link href={item.href}>
                      <Icon className="size-4" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  </Button>
                );
              })}
            </nav>

          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </div>
    </div>
  );
}
