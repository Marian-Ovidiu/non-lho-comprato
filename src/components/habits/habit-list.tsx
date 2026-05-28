import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HabitCard } from "@/src/components/habits/habit-card";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
};

type HabitListProps = {
  categories: CategoryOption[];
  members: WorkspaceMemberOption[];
  currentUserId: string;
  workspaceKind: "private" | "shared";
  habits: Array<{
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
    _count: {
      occurrences: number;
    };
  }>;
};

export function HabitList({
  habits,
  categories,
  members,
  currentUserId,
  workspaceKind,
}: HabitListProps) {
  if (habits.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[14px] border border-dashed border-border/70 bg-surface-muted/60 px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Nessuna abitudine ancora. Creane una e comparirà qui nei giorni scelti.
        </p>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link href="#nuova-abitudine">Crea abitudine</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between px-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Tutte le tue abitudini
        </p>
        <span className="font-num text-[11px]" style={{ color: "var(--text-3)" }}>
          {habits.length}
        </span>
      </div>
      {habits.map((habit) => (
        <HabitCard
          key={habit.id}
          habit={habit}
          categories={categories}
          members={members}
          currentUserId={currentUserId}
          workspaceKind={workspaceKind}
        />
      ))}
    </div>
  );
}
