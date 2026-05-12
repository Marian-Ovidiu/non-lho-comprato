"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Home,
  List,
  MoreHorizontal,
  Plus,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthControls } from "@/src/components/auth/auth-controls";
import { InstallButton } from "@/src/components/pwa/install-button";

export type AppShellWorkspace = {
  id: string;
  name: string;
  kind: "private" | "shared";
  isShared: boolean;
};

export type AppShellAuth = {
  isAuthenticated: boolean;
  userLabel?: string | null;
};

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
  center = false,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  mobile?: boolean;
  center?: boolean;
}) {
  if (center) {
    return (
      <Button
        asChild
        variant="default"
        size="icon"
        className="size-12 rounded-full border border-border/70 bg-primary text-primary-foreground shadow-[0_18px_40px_rgba(0,0,0,0.2)] hover:bg-primary/90"
      >
        <Link href={href} aria-label={label}>
          <Plus className="size-5" aria-hidden="true" />
        </Link>
      </Button>
    );
  }

  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className={cn(
        mobile
          ? "h-12 flex-col gap-1 rounded-2xl px-1 text-[10px] font-medium"
          : "min-w-fit shrink-0 justify-start gap-2 rounded-full px-4",
        active
          ? "bg-surface-muted text-foreground ring-1 ring-border/80 hover:bg-surface-muted"
          : "text-muted-text hover:bg-surface-muted/60 hover:text-foreground",
      )}
    >
      <Link href={href} aria-current={active ? "page" : undefined}>
        <Icon className={cn("size-4", mobile && "size-5")} aria-hidden="true" />
        <span className="leading-none">{label}</span>
      </Link>
    </Button>
  );
}

export function AppShell({
  children,
  workspace,
  auth,
}: {
  children: React.ReactNode;
  workspace: AppShellWorkspace;
  auth: AppShellAuth;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/88 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="mx-auto w-full max-w-5xl px-4 py-3 sm:px-6 lg:px-8 lg:py-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-text">
                  Non l&apos;ho comprato
                </p>
                <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                  Schiva spese inutili, un movimento alla volta.
                </h1>
              </div>

              <div className="shrink-0">
                <div className="flex items-center gap-2">
                  <AuthControls
                    isAuthenticated={auth.isAuthenticated}
                    userLabel={auth.userLabel}
                  />
                  <InstallButton compact />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-text">
              <span className="rounded-full border border-border bg-surface px-3 py-1 font-medium text-foreground">
                {workspace.name}
              </span>
              <span className="hidden sm:inline">
                {workspace.isShared ? "Workspace condiviso" : "Workspace privato"}
              </span>
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

      <div className="mx-auto w-full max-w-5xl px-4 py-4 pb-32 sm:px-6 sm:py-6 sm:pb-8 lg:px-8">
        {children}
      </div>

      <nav
        aria-label="Navigazione principale"
        className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden"
      >
        <div className="mx-auto max-w-md rounded-[1.75rem] border border-border/70 bg-surface/88 px-2.5 pb-2.5 pt-3 shadow-[0_18px_50px_rgba(0,0,0,0.2)] backdrop-blur supports-[backdrop-filter]:bg-surface/80">
          <div className="grid grid-cols-5 items-end gap-1">
            <NavButton
              href={primaryNavItems[0].href}
              label={primaryNavItems[0].label}
              icon={primaryNavItems[0].icon}
              active={isActivePath(pathname, primaryNavItems[0].href)}
              mobile
            />
            <NavButton
              href={primaryNavItems[1].href}
              label={primaryNavItems[1].label}
              icon={primaryNavItems[1].icon}
              active={isActivePath(pathname, primaryNavItems[1].href)}
              mobile
            />
            <div className="flex justify-center">
              <NavButton href="/entries/new" label="Nuovo movimento" icon={Plus} active={false} center />
            </div>
            <NavButton
              href={primaryNavItems[3].href}
              label={primaryNavItems[3].label}
              icon={primaryNavItems[3].icon}
              active={isActivePath(pathname, primaryNavItems[3].href)}
              mobile
            />
            <NavButton
              href={primaryNavItems[4].href}
              label={primaryNavItems[4].label}
              icon={primaryNavItems[4].icon}
              active={isActivePath(pathname, primaryNavItems[4].href)}
              mobile
            />
          </div>
        </div>
      </nav>
    </div>
  );
}
