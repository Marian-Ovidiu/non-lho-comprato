"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, List, MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { QuickAddSheet } from "@/src/components/entries/quick-add-sheet";
import type { AppShellWorkspace } from "@/src/components/layout/app-shell";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";
import { triggerHaptic } from "@/src/lib/haptics";

const mobileNavItems = [
  { href: "/", label: "Oggi", icon: Home },
  { href: "/entries", label: "Movimenti", icon: List },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/more", label: "Altro", icon: MoreHorizontal },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/more") return pathname === "/more";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function TabItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch
      aria-current={active ? "page" : undefined}
      onClick={() => !active && triggerHaptic("subtle")}
      className="flex flex-1 flex-col items-center justify-center gap-[3px] transition-opacity duration-150 active:opacity-70"
      style={{ color: active ? "var(--foreground)" : "var(--text-3)" }}
    >
      <Icon className="size-5" aria-hidden="true" />
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </Link>
  );
}

type MobileTabBarProps = {
  workspace: AppShellWorkspace;
  members: WorkspaceMemberOption[];
  currentUserId: string;
};

export function MobileTabBar({ workspace, members, currentUserId }: MobileTabBarProps) {
  const pathname = usePathname();
  const [left1, left2, right1, right2] = mobileNavItems;

  return (
    <nav
      aria-label="Navigazione principale"
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+22px)] md:hidden"
    >
      <div
        className="mx-auto flex max-w-[24rem] items-center px-2.5"
        style={{
          height: 64,
          borderRadius: 28,
          background: "rgba(20,20,22,0.86)",
          backdropFilter: "blur(20px) saturate(140%)",
          border: "1px solid var(--border-strong)",
        }}
      >
        {/* Left slots */}
        <TabItem
          href={left1.href}
          label={left1.label}
          icon={left1.icon}
          active={isActivePath(pathname, left1.href)}
        />
        <TabItem
          href={left2.href}
          label={left2.label}
          icon={left2.icon}
          active={isActivePath(pathname, left2.href)}
        />

        {/* Center [+] */}
        <div className="flex flex-1 items-center justify-center">
          <QuickAddSheet
            workspace={workspace}
            members={members}
            currentUserId={currentUserId}
          />
        </div>

        {/* Right slots */}
        <TabItem
          href={right1.href}
          label={right1.label}
          icon={right1.icon}
          active={isActivePath(pathname, right1.href)}
        />
        <TabItem
          href={right2.href}
          label={right2.label}
          icon={right2.icon}
          active={isActivePath(pathname, right2.href)}
        />
      </div>
    </nav>
  );
}
