import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PersonFilterValue } from "@/src/lib/person-filter";
import {
  getPersonFilterOptions,
  normalizeLegacyPerson,
} from "@/src/lib/ui-person";

type PersonFilterProps = {
  person?: PersonFilterValue;
  basePath: "/" | "/stats";
  compact?: boolean;
};

export function PersonFilter({
  person,
  basePath,
  compact = false,
}: PersonFilterProps) {
  const options = getPersonFilterOptions().map((option) => ({
    href:
      option.value === ""
        ? basePath
        : `${basePath}?person=${encodeURIComponent(option.value)}`,
    label: option.label,
    value:
      option.value === ""
        ? undefined
        : (option.value as PersonFilterValue),
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
            const isActive = normalizeLegacyPerson(person) === option.value;

            return (
              <Button
                key={option.label}
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
