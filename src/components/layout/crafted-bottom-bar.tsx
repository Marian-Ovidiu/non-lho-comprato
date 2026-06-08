"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { QuickAddSheet } from "@/src/components/entries/quick-add-sheet";
import type { AppShellWorkspace } from "@/src/components/layout/app-shell";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/src/lib/haptics";

const leftNavItems = [
  { href: "/", label: "Oggi" },
  { href: "/entries", label: "Movimenti" },
] as const;

const rightNavItems = [
  { href: "/stats", label: "Stats" },
  { href: "/more", label: "Altro" },
] as const;

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
        "min-w-0 flex-1 text-center text-xs leading-none transition-opacity active:opacity-70",
        active
          ? "font-semibold text-foreground"
          : "font-[450] text-ink-3",
      )}
    >
      {label}
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

  return (
    <nav
      aria-label="Navigazione principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background md:hidden"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-6 pb-[calc(env(safe-area-inset-bottom)+1.625rem)] pt-3">
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