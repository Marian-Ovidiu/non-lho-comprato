import { NotebookPen } from "lucide-react";

import { cn } from "@/lib/utils";

export type HomeReflectionNoteProps = {
  label: string;
  text: string;
};

export function HomeReflectionNote({ label, text }: HomeReflectionNoteProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-border/60 bg-surface/60 px-3.5 py-3 shadow-sm",
        "text-sm leading-6 text-muted-text",
      )}
    >
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background text-muted-text">
        <NotebookPen className="size-4" aria-hidden="true" />
      </div>

      <div className="min-w-0 space-y-0.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-text">
          {label}
        </p>
        <p className="text-sm leading-5 text-foreground">{text}</p>
      </div>
    </div>
  );
}
