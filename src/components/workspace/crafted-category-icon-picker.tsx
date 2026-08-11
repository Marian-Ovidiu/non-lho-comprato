"use client";

import { CraftedIcon } from "@/components/crafted";
import { cn } from "@/lib/utils";
import { SELECTABLE_CATEGORY_ICONS } from "@/src/lib/category-crafted-icon";
import { useTranslations } from "@/src/components/language/language-context";

/**
 * Le icone disponibili, mostrate.
 *
 * Prima erano un campo di testo con segnaposto "es. coffee": per sceglierne
 * una bisognava sapere a memoria come si chiama. Chi non lo sapeva lasciava
 * vuoto, e la categoria finiva con l'icona di riserva.
 */
export function CraftedCategoryIconPicker({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (icon: string) => void;
  id?: string;
}) {
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-1.5">
      <span
        id={id}
        className="font-num text-[10px] uppercase tracking-[0.22em] text-ink-3"
      >
        {t.workspace.catIconOptionalLabel}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={id}
        className="grid grid-cols-6 gap-1.5 sm:grid-cols-10"
      >
        {SELECTABLE_CATEGORY_ICONS.map((icon) => {
          const selected = value === icon;

          return (
            <button
              key={icon}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={icon}
              onClick={() => onChange(selected ? "" : icon)}
              className={cn(
                "nlc-press flex aspect-square items-center justify-center rounded-[var(--r-control)] border transition-colors",
                selected
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-line text-muted-foreground hover:border-foreground/30",
              )}
            >
              <CraftedIcon name={icon} size={17} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
