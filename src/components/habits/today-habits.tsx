import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HabitOccurrenceActions } from "@/src/components/habits/habit-occurrence-actions";
import { formatMoney } from "@/src/lib/formatters";
import { getCategoryEmoji } from "@/src/lib/visual-cues";

type TodayHabitsProps = {
  occurrences: Array<{
    id: string;
    habitId: string;
    date: string;
    status: "pending" | "spent" | "avoided" | "skipped";
    createdAt: string;
    updatedAt: string;
    habit: {
      id: string;
      name: string;
      categoryId: string;
      amount: number;
      activeDays: unknown;
      isActive: boolean;
      defaultBehavior: string;
      targetScope: string;
      targetUserId: string | null;
      reminderEnabled: boolean;
      reminderTime: string | null;
      createdAt: string;
      updatedAt: string;
      category: {
        id: string;
        name: string;
        slug: string;
        color: string | null;
        icon: string | null;
      };
    };
    entry: {
      id: string;
      title: string;
      realCost: number;
      alternativeCost: number;
      savedAmount: number;
      source: string;
    } | null;
  }>;
};

export function TodayHabits({ occurrences }: TodayHabitsProps) {
  if (occurrences.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[14px] border border-dashed border-border/70 bg-surface-muted/60 px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Nessuna abitudine attiva per oggi. Quando ne crei una, la vedrai qui.
        </p>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link href="#nuova-abitudine">Nuova abitudine</Link>
        </Button>
      </div>
    );
  }

  const avoided = occurrences.filter((o) => o.status === "avoided").length;

  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-surface">
      <div className="flex items-baseline justify-between px-4 pb-2 pt-[18px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Oggi
        </p>
        <span className="font-num text-[11px]" style={{ color: "var(--text-3)" }}>
          {avoided}/{occurrences.length} evitate
        </span>
      </div>

      <div className="px-4 pb-2">
        {occurrences.map((occurrence, i) => {
          const emoji = getCategoryEmoji({
            slug: occurrence.habit.category.slug,
            name: occurrence.habit.category.name,
          });
          return (
            <div
              key={occurrence.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 0",
                borderBottom:
                  i < occurrences.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <div
                className="flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted"
                style={{ width: 40, height: 40, fontSize: 20 }}
              >
                {emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="truncate text-[15px] font-medium">{occurrence.habit.name}</p>
                <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                  {occurrence.habit.category.name} · {formatMoney(occurrence.habit.amount)}
                </p>
                <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                  {occurrence.habit.targetScope === "shared" ? "Per: Condivisa" : "Per: Solo io"}
                </p>
              </div>
              <HabitOccurrenceActions
                occurrenceId={occurrence.id}
                currentStatus={occurrence.status}
                compact
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
