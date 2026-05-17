import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getWorkspaceMemberFilterOptions } from "@/src/lib/workspace-member-filter";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";

type PersonFilterProps = {
  members: WorkspaceMemberOption[];
  selectedMemberUserId?: string;
  basePath: "/" | "/stats";
  compact?: boolean;
};

export function PersonFilter({
  members,
  selectedMemberUserId,
  basePath,
  compact = false,
}: PersonFilterProps) {
  const options = getWorkspaceMemberFilterOptions(members).map((option) => ({
    href:
      option.value === ""
        ? basePath
        : `${basePath}?person=${encodeURIComponent(option.value)}`,
    label: option.label,
    value: option.value === "" ? undefined : option.value,
  }));

  return (
    <section
      aria-labelledby="person-filter-title"
      className={
        compact
          ? "rounded-xl border border-border bg-surface p-3 shadow-sm dark:border-border dark:bg-surface-muted"
          : "rounded-2xl border border-border bg-surface p-4 shadow-sm dark:border-border dark:bg-surface-muted"
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          id="person-filter-title"
          className={
            compact
              ? "text-xs font-medium uppercase tracking-[0.16em] text-muted-text dark:text-muted-text"
              : "text-sm font-medium text-foreground dark:text-foreground"
          }
        >
          Persona
        </p>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const isActive = selectedMemberUserId === option.value;

            return (
              <Button
                key={option.value ?? "all"}
                asChild
                variant={isActive ? "default" : "outline"}
                size="sm"
                className={cn(
                  compact
                    ? "h-8 w-auto px-3 text-xs sm:text-sm"
                    : "w-full sm:w-auto",
                  isActive
                    ? "dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary-hover dark:hover:text-primary-foreground"
                    : "dark:border-border dark:bg-surface dark:text-foreground dark:hover:bg-surface-muted dark:hover:text-foreground",
                )}
              >
                <Link
                  href={option.href}
                  aria-current={isActive ? "page" : undefined}
                >
                  {option.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
