import { cn } from "@/lib/utils";

type CraftedImportRowActionsProps = {
  id: string;
  status: "pending" | "confirmed" | "ignored" | "duplicate" | "error";
  selectable?: boolean;
  compact?: boolean;
};

const STATUS_LABELS: Record<CraftedImportRowActionsProps["status"], string> = {
  pending: "In attesa",
  confirmed: "Confermata",
  ignored: "Ignorata",
  duplicate: "Duplicata",
  error: "Errore",
};

const STATUS_CLASSES: Record<CraftedImportRowActionsProps["status"], string> = {
  pending: "border-line bg-surface-muted text-foreground",
  confirmed: "border-border bg-emerald-500/10 text-emerald-700",
  ignored: "border-border bg-muted text-muted-foreground",
  duplicate: "border-border bg-amber-500/10 text-amber-700",
  error: "border-destructive/20 bg-destructive/10 text-destructive",
};

export function CraftedImportRowActions({
  id,
  status,
  selectable = false,
  compact = false,
}: CraftedImportRowActionsProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2",
        compact ? "text-[12px]" : "text-sm",
      )}
    >
      {selectable ? (
        <label className="inline-flex items-center gap-2 text-xs font-medium text-foreground">
          <input
            type="checkbox"
            name="transactionIds"
            value={id}
            className="size-4 rounded border-line"
          />
          Seleziona
        </label>
      ) : null}
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em]",
          STATUS_CLASSES[status],
        )}
      >
        {STATUS_LABELS[status]}
      </span>
    </div>
  );
}

