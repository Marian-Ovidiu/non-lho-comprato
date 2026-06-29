"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import type { AppShellWorkspace } from "@/src/components/layout/app-shell";

const QuickAddSheet = dynamic(
  () =>
    import("@/src/components/entries/quick-add-sheet").then((m) => ({
      default: m.QuickAddSheet,
    })),
  {
    ssr: false,
    loading: () => (
      <button
        disabled
        aria-hidden="true"
        className="size-10 rounded-full border-[1.5px] border-accent bg-transparent"
      />
    ),
  },
);
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/src/lib/haptics";
import { useTranslations } from "@/src/components/language/language-context";

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  if (href === "/more") {
    return pathname === "/more";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function BottomNavLink({
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
        "nlc-press relative flex h-14 min-w-0 flex-1 basis-0 items-center justify-center rounded-[var(--r-card)] px-3 text-center text-xs leading-none outline-none transition-[background-color,color,opacity,transform] focus-visible:ring-2 focus-visible:ring-ring/50",
        active
          ? "bg-surface-muted font-semibold text-foreground"
          : "font-[450] text-ink-3 hover:bg-surface-muted/55 hover:text-foreground",
      )}
    >
      <span className="pointer-events-none flex h-full w-full items-center justify-center">
        {label}
      </span>
      <span
        className={cn(
          "nlc-tab-dot absolute bottom-[7px] left-1/2 h-1 w-4 -translate-x-1/2 rounded-full bg-accent",
          active ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0",
        )}
        aria-hidden="true"
      />
    </Link>
  );
}

type CraftedBottomBarProps = {
  workspace: AppShellWorkspace;
  currentUserId: string;
};

export function CraftedBottomBar({
  workspace,
  currentUserId,
}: CraftedBottomBarProps) {
  const pathname = usePathname();
  const t = useTranslations();

  const leftNavItems = [
    { href: "/", label: t.nav.today },
    { href: "/entries", label: t.nav.entries },
  ];

  const rightNavItems = [
    { href: "/stats", label: t.nav.stats },
    { href: "/more", label: "Tu" },
  ];

  return (
    <nav
      aria-label={t.nav.mainNavLabel}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background md:hidden"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-2.5">
        {leftNavItems.map((item) => (
          <BottomNavLink
            key={item.href}
            href={item.href}
            label={item.label}
            active={isActivePath(pathname, item.href)}
          />
        ))}

        <div className="flex shrink-0 items-center justify-center px-1">
          <QuickAddSheet
            workspace={workspace}
            currentUserId={currentUserId}
            triggerVariant="crafted"
          />
        </div>

        {rightNavItems.map((item) => (
          <BottomNavLink
            key={item.href}
            href={item.href}
            label={item.label}
            active={isActivePath(pathname, item.href)}
          />
        ))}
      </div>
    </nav>
  );
}
