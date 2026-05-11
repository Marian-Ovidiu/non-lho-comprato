"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Home,
  List,
  MoreHorizontal,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InstallButton } from "@/src/components/pwa/install-button";

const primaryNavItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/entries", label: "Movimenti", icon: List },
  { href: "/goals", label: "Obiettivi", icon: Target },
  { href: "/stats", label: "Statistiche", icon: BarChart3 },
  { href: "/more", label: "Altro", icon: MoreHorizontal },
] as const;

const desktopNavItems = primaryNavItems;

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  if (href === "/more") {
    return pathname === "/more";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavButton({
  href,
  label,
  icon: Icon,
  active,
  mobile = false,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  mobile?: boolean;
}) {
  return (
    <Button
      asChild
      variant={active ? "default" : "ghost"}
      size="sm"
      className={cn(
        mobile
          ? "h-14 flex-col gap-1 rounded-2xl px-1 text-[11px] font-medium"
          : "min-w-fit shrink-0 justify-start gap-2 rounded-full px-4",
        active ? "bg-accent text-background hover:bg-accent/90" : "text-muted-text hover:text-foreground",
      )}
    >
      <Link href={href} aria-current={active ? "page" : undefined}>
        <Icon className="size-4" aria-hidden="true" />
        <span className="leading-none">{label}</span>
      </Link>
    </Button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-text">
                  Non l&apos;ho comprato
                </p>
                <h1 className="text-lg font-semibold tracking-tight text-foreground">
                  Schiva spese inutili, un movimento alla volta.
                </h1>
              </div>

              <div className="shrink-0">
                <InstallButton />
              </div>
            </div>

            <nav aria-label="Navigazione desktop" className="hidden gap-2 md:flex">
              {desktopNavItems.map((item) => (
                <NavButton
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isActivePath(pathname, item.href)}
                />
              ))}
            </nav>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 py-5 pb-28 sm:px-6 sm:py-8 sm:pb-8 lg:px-8">
        {children}
      </div>

      <nav
        aria-label="Navigazione principale"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur supports-[backdrop-filter]:bg-surface/90 md:hidden"
      >
        <div className="mx-auto grid w-full max-w-5xl grid-cols-5 gap-1 px-2">
          {primaryNavItems.map((item) => (
            <NavButton
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActivePath(pathname, item.href)}
              mobile
            />
          ))}
        </div>
      </nav>
    </div>
  );
}
