import { cn } from "@/lib/utils";
import { getCategoryEmoji } from "@/src/lib/visual-cues";
import { getCategoryIdentity } from "@/src/lib/category-identity";

type CategoryPillProps = {
  category: {
    name: string;
    slug?: string | null;
  };
  className?: string;
};

export function CategoryPill({ category, className }: CategoryPillProps) {
  const identity = getCategoryIdentity(category);

  return (
    <span
      className={cn(
        "inline-flex max-w-full min-h-6 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-none tracking-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-200 ease-[cubic-bezier(.2,.8,.2,1)]",
        identity.chipClassName,
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] leading-none",
          identity.markerClassName,
        )}
        aria-hidden="true"
      >
        {getCategoryEmoji(category)}
      </span>
      <span className="truncate">{category.name}</span>
    </span>
  );
}
