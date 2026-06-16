"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { Rule } from "@/components/crafted";
import { PullToRefresh, ToastProvider } from "@/components/crafted/motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CraftedBottomBar } from "@/src/components/layout/crafted-bottom-bar";
import { CraftedMasthead } from "@/src/components/layout/crafted-masthead";
import { FeedbackButton } from "@/src/components/feedback/feedback-button";
import { useDailyReminderOnOpen } from "@/src/lib/notifications/use-daily-reminder-on-open";
import { InstallButton } from "@/src/components/pwa/install-button";
import { WorkspaceSwitcher } from "@/src/components/layout/workspace-switcher";
import { triggerHaptic } from "@/src/lib/haptics";
import { CurrencyProvider } from "@/src/components/currency/currency-context";
import { LanguageProvider, useTranslations } from "@/src/components/language/language-context";
import { getTranslations } from "@/src/lib/i18n";

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

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  if (href === "/more") {
    return pathname === "/more";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function DesktopNavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch
      aria-current={active ? "page" : undefined}
      onClick={() => !active && triggerHaptic("subtle")}
      className={cn(
        "whitespace-nowrap border-b-[1.5px] pb-2 text-sm transition-colors",
        "focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        active
          ? "border-accent font-semibold text-foreground"
          : "border-transparent font-[450] text-ink-3 hover:text-muted-foreground",
      )}
    >
      {label}
    </Link>
  );
}

function AccountButton({
  isAuthenticated,
  userLabel,
  t,
}: AppShellAuth & { t: ReturnType<typeof useTranslations> }) {
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
      <Button asChild variant="outline" size="sm" className="h-8 rounded-full px-3 text-xs">
        <Link href="/login">{t.more.login}</Link>
      </Button>
    );
  }

  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className="h-8 rounded-full px-2 text-foreground hover:bg-surface-muted/60"
    >
      <Link href="/more" aria-label="Apri profilo">
        <span className="inline-flex size-6 items-center justify-center rounded-full border border-line text-[10px] font-semibold">
          {initials}
        </span>
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
  currency,
  language,
}: {
  children: React.ReactNode;
  workspace: AppShellWorkspace;
  availableWorkspaces: AppShellWorkspace[];
  currentUserId: string;
  auth: AppShellAuth;
  currency: string;
  language: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = getTranslations(language);

  const desktopNavItems = [
    { href: "/", label: t.nav.today },
    { href: "/entries", label: t.nav.entries },
    { href: "/goals", label: t.nav.goals },
    { href: "/stats", label: t.nav.stats },
    { href: "/more", label: t.nav.more },
  ];

  const [isWorkspaceSwitching, setIsWorkspaceSwitching] = useState(false);
  const workspaceSwitchEndTimerRef = useRef<number | null>(null);
  const pendingWorkspaceSwitchIdRef = useRef<string | null>(null);
  const previousWorkspaceIdRef = useRef(workspace.id);
  useDailyReminderOnOpen();

  const handleShellRefresh = useCallback(() => {
    router.refresh();
    return Promise.resolve();
  }, [router]);

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
    <LanguageProvider language={language}>
    <CurrencyProvider currency={currency}>
    <ToastProvider>
      <div className="min-h-[100dvh] bg-background text-foreground">
        <header className="sticky top-0 z-30 bg-background">
          <div className="mx-auto w-full max-w-5xl">
            <CraftedMasthead
              trailing={
                <div className="hidden items-center gap-1 sm:flex">
                  <InstallButton compact />
                  <AccountButton
                    isAuthenticated={auth.isAuthenticated}
                    userLabel={auth.userLabel}
                    t={t}
                  />
                </div>
              }
            />
            <Rule />

            <div className="flex items-center justify-between gap-3 px-5 py-2.5">
              <div className="min-w-0 flex-1 space-y-1">
                <WorkspaceSwitcher
                  currentWorkspace={workspace}
                  availableWorkspaces={availableWorkspaces}
                />
                {isWorkspaceSwitching ? (
                  <p
                    className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.16em] text-accent"
                    aria-live="polite"
                  >
                    <Loader2
                      className="size-3 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                    {t.workspaceSwitcher.switching}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-1 sm:hidden">
                <InstallButton compact />
                <AccountButton
                  isAuthenticated={auth.isAuthenticated}
                  userLabel={auth.userLabel}
                  t={t}
                />
              </div>
            </div>

            <nav
              aria-label={t.nav.desktopNavLabel}
              className="hidden gap-5 overflow-x-auto px-5 pb-3 md:flex"
            >
              {desktopNavItems.map((item) => (
                <DesktopNavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  active={isActivePath(pathname, item.href)}
                />
              ))}
            </nav>

            <Rule />
          </div>
        </header>

        <PullToRefresh onRefresh={handleShellRefresh}>
          <div
            className={cn(
              "mx-auto w-full max-w-5xl px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] sm:px-6 sm:py-6 sm:pb-[calc(env(safe-area-inset-bottom)+2rem)] lg:px-8",
              "transition-[opacity,filter] duration-150 ease-out motion-reduce:transition-none",
              isWorkspaceSwitching && "pointer-events-none opacity-75 blur-[0.5px]",
            )}
          >
            {children}
          </div>
        </PullToRefresh>

        <CraftedBottomBar workspace={workspace} currentUserId={currentUserId} />
        <FeedbackButton />
        {/* Global polite live region — sr-only, for future programmatic announcements */}
        <div
          id="nlc-live-region"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="pointer-events-none fixed left-0 top-0 h-px w-px overflow-hidden opacity-0"
        />
      </div>
    </ToastProvider>
    </CurrencyProvider>
    </LanguageProvider>
  );
}
