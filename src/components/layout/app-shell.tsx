"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Home,
  List,
  Loader2,
  MoreHorizontal,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MobileTabBar } from "@/src/components/layout/mobile-tab-bar";
import { useDailyReminderOnOpen } from "@/src/lib/notifications/use-daily-reminder-on-open";
import { InstallButton } from "@/src/components/pwa/install-button";
import { WorkspaceSwitcher } from "@/src/components/layout/workspace-switcher";
import { triggerHaptic } from "@/src/lib/haptics";

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
  { href: "/", label: "Oggi", icon: Home },
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
      variant="ghost"
      size="sm"
      className={cn(
        mobile
          ? "h-12 flex-col gap-1 rounded-2xl px-1 text-[10px] font-medium transition-[transform,background-color,color,box-shadow,opacity] duration-200 ease-[cubic-bezier(.2,.8,.2,1)] active:translate-y-0 active:scale-[0.99]"
          : "min-w-fit shrink-0 justify-start gap-2 rounded-full px-4 transition-[transform,background-color,color,box-shadow,opacity] duration-200 ease-[cubic-bezier(.2,.8,.2,1)] active:translate-y-0 active:scale-[0.99]",
        active
          ? "bg-accent/10 text-accent ring-1 ring-accent/20 shadow-sm hover:bg-accent/10"
          : "text-muted-foreground hover:bg-surface-muted/60 hover:text-foreground",
      )}
    >
      <Link
        href={href}
        prefetch
        aria-current={active ? "page" : undefined}
      >
        <Icon
          className={cn(
            "size-4 transition-transform duration-200 ease-[cubic-bezier(.2,.8,.2,1)]",
            mobile && "size-5",
            active && "scale-[1.06]",
          )}
          aria-hidden="true"
        />
        <span className="leading-none">{label}</span>
      </Link>
    </Button>
  );
}

function AccountButton({
  isAuthenticated,
  userLabel,
}: AppShellAuth) {
  const initials = userLabel
    ? userLabel
        .split(" ")
        .map((part) => part.trim().charAt(0))
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "M";

  if (!isAuthenticated) {
    return (
      <Button asChild variant="outline" size="sm" className="h-9 rounded-full px-3">
        <Link href="/login">Accedi</Link>
      </Button>
    );
  }

  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className="h-9 gap-2 rounded-full border border-border/70 bg-background/60 px-3 text-foreground transition-[transform,background-color,color,box-shadow,opacity] duration-200 ease-[cubic-bezier(.2,.8,.2,1)] hover:bg-surface-muted/70"
    >
      <Link href="/more" aria-label="Apri profilo">
        <span className="inline-flex size-6 items-center justify-center rounded-full border border-border bg-surface text-[10px] font-semibold text-foreground">
          {initials}
        </span>
        <span className="hidden sm:inline">Profilo</span>
      </Link>
    </Button>
  );
}

export function AppShell({
  children,
  workspace,
  availableWorkspaces,
  currentUserId,
  auth,
}: {
  children: React.ReactNode;
  workspace: AppShellWorkspace;
  availableWorkspaces: AppShellWorkspace[];
  currentUserId: string;
  auth: AppShellAuth;
}) {
  const pathname = usePathname();
  const [isWorkspaceSwitching, setIsWorkspaceSwitching] = useState(false);
  const workspaceSwitchEndTimerRef = useRef<number | null>(null);
  const pendingWorkspaceSwitchIdRef = useRef<string | null>(null);
  const previousWorkspaceIdRef = useRef(workspace.id);
  useDailyReminderOnOpen();

  useEffect(() => {
    function handleWorkspaceSwitchStart(event: Event) {
      const customEvent = event as CustomEvent<{ workspaceId?: string }>;

      setIsWorkspaceSwitching(true);
      pendingWorkspaceSwitchIdRef.current = customEvent.detail?.workspaceId ?? null;
    }

    function handleWorkspaceSwitchEnd() {
      if (workspaceSwitchEndTimerRef.current) {
        window.clearTimeout(workspaceSwitchEndTimerRef.current);
      }

      workspaceSwitchEndTimerRef.current = window.setTimeout(() => {
        setIsWorkspaceSwitching(false);
      }, 120);
    }

    window.addEventListener("nlc:workspace-switch-start", handleWorkspaceSwitchStart);
    window.addEventListener("nlc:workspace-switch-end", handleWorkspaceSwitchEnd);

    return () => {
      if (workspaceSwitchEndTimerRef.current) {
        window.clearTimeout(workspaceSwitchEndTimerRef.current);
      }

      window.removeEventListener(
        "nlc:workspace-switch-start",
        handleWorkspaceSwitchStart,
      );
    window.removeEventListener("nlc:workspace-switch-end", handleWorkspaceSwitchEnd);
    };
  }, []);

  useEffect(() => {
    if (
      pendingWorkspaceSwitchIdRef.current &&
      previousWorkspaceIdRef.current !== workspace.id &&
      pendingWorkspaceSwitchIdRef.current === workspace.id
    ) {
      triggerHaptic("subtle");
      pendingWorkspaceSwitchIdRef.current = null;
    }

    previousWorkspaceIdRef.current = workspace.id;
  }, [workspace.id]);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/84 backdrop-blur supports-[backdrop-filter]:bg-surface/78">
        <div className="mx-auto w-full max-w-5xl px-4 py-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] sm:px-6 sm:pt-[calc(env(safe-area-inset-top)+0.5rem)] lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <WorkspaceSwitcher
                currentWorkspace={workspace}
                availableWorkspaces={availableWorkspaces}
              />
              {isWorkspaceSwitching ? (
                <p
                  className="inline-flex items-center gap-1 rounded-full border border-premium-accent/20 bg-premium-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-premium-accent"
                  aria-live="polite"
                >
                  <Loader2
                    className="size-3 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                  Cambio spazio…
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <InstallButton compact />
              <AccountButton
                isAuthenticated={auth.isAuthenticated}
                userLabel={auth.userLabel}
              />
            </div>
          </div>

          <nav aria-label="Navigazione desktop" className="mt-2 hidden gap-2 md:flex">
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
      </header>

      <div
        className={cn(
          "mx-auto w-full max-w-5xl px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+8rem)] sm:px-6 sm:py-6 sm:pb-[calc(env(safe-area-inset-bottom)+2rem)] lg:px-8",
          "transition-[opacity,filter] duration-150 ease-out motion-reduce:transition-none",
          isWorkspaceSwitching && "pointer-events-none opacity-75 blur-[0.5px]",
        )}
      >
        {children}
      </div>

      <MobileTabBar
        workspace={workspace}
        currentUserId={currentUserId}
      />
    </div>
  );
}
