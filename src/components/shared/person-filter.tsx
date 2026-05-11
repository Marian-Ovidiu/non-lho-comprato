import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { PersonFilterValue } from "@/src/lib/person-filter";

type PersonFilterProps = {
  person?: PersonFilterValue;
  basePath: "/" | "/stats";
};

export function PersonFilter({ person, basePath }: PersonFilterProps) {
  const options = [
    { href: basePath, label: "Tutti", value: undefined },
    { href: `${basePath}?person=MARIAN`, label: "Marian", value: "MARIAN" },
    { href: `${basePath}?person=MARTINA`, label: "Martina", value: "MARTINA" },
  ] satisfies Array<{
    href: string;
    label: string;
    value?: PersonFilterValue;
  }>;

  return (
    <section
      aria-labelledby="person-filter-title"
      className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          id="person-filter-title"
          className="text-sm font-medium text-zinc-950"
        >
          Persona
        </p>
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
          {options.map((option) => {
            const isActive = option.value === person;

            return (
              <Button
                key={option.label}
                asChild
                variant={isActive ? "default" : "outline"}
                size="sm"
                className="w-full sm:w-auto"
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
