import Link from "next/link";

import { Eyebrow } from "@/components/crafted";
import { cn } from "@/lib/utils";
import { getWorkspaceMemberFilterOptions } from "@/src/lib/workspace-member-filter";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";

/**
 * NOTA: questo componente non è montato da nessuna parte. Il filtro per persona
 * che si vede su /stats è la `select` dentro `CraftedStatsPeriodFilter`; questa
 * è una seconda implementazione della stessa scelta, in un'altra forma (tab
 * sottolineate) e con l'etichetta scritta a mano invece che in `src/lib/i18n`.
 * Non l'ho tolta — il brief dice che i filtri restano — ma la raccomandazione
 * sta nel documento: due forme per la stessa scelta è la definizione di
 * interfaccia che mente, e questa delle due non la vede nessuno.
 */
type CraftedPersonFilterProps = {
  members: WorkspaceMemberOption[];
  selectedMemberUserId?: string;
  basePath: "/" | "/stats";
  extraParams?: Record<string, string | undefined>;
};

export function CraftedPersonFilter({
  members,
  selectedMemberUserId,
  basePath,
  extraParams = {},
}: CraftedPersonFilterProps) {
  const options = getWorkspaceMemberFilterOptions(members).map((option) => ({
    href: buildPersonFilterHref(basePath, option.value, extraParams),
    label: option.label,
    value: option.value === "" ? undefined : option.value,
  }));

  if (options.length <= 1) {
    return null;
  }

  return (
    <section aria-labelledby="crafted-person-filter" className="-mx-4 px-5 py-4 sm:-mx-6 lg:-mx-8">
      <Eyebrow className="mb-3 block">
        <span id="crafted-person-filter">Persona</span>
      </Eyebrow>
      <div className="flex gap-5 overflow-x-auto pb-1">
        {options.map((option) => {
          const isActive = selectedMemberUserId === option.value;

          return (
            <Link
              key={option.value ?? "all"}
              href={option.href}
              className={cn(
                "shrink-0 border-b-[1.5px] pb-2 text-[13px] whitespace-nowrap transition-colors",
                isActive
                  ? "border-accent font-semibold text-foreground"
                  : "border-transparent font-[450] text-ink-3 hover:text-foreground",
              )}
            >
              {option.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function buildPersonFilterHref(
  basePath: CraftedPersonFilterProps["basePath"],
  personValue: string,
  extraParams: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(extraParams)) {
    if (value) {
      params.set(key, value);
    }
  }

  if (personValue) {
    params.set("person", personValue);
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
