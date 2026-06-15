"use client";

import Link from "next/link";

import { Rule } from "@/components/crafted";
import { useTranslations } from "@/src/components/language/language-context";
import { CraftedHabitCard } from "@/src/components/habits/crafted-habit-card";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
};

type CraftedHabitListProps = {
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

export function CraftedHabitList({
  habits,
  categories,
  members,
  currentUserId,
  workspaceKind,
}: CraftedHabitListProps) {
  const t = useTranslations();

  if (habits.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-ink-3">
          {t.habits.noTodayHabits}
        </p>
        <Link
          href="#nuova-abitudine"
          className="mt-4 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {t.habits.createHabitLink}
        </Link>
      </div>
    );
  }

  return (
    <div>
      {habits.map((habit, index) => (
        <div key={habit.id}>
          <CraftedHabitCard
            habit={habit}
            categories={categories}
            members={members}
            currentUserId={currentUserId}
            workspaceKind={workspaceKind}
          />
          {index < habits.length - 1 ? <Rule soft /> : null}
        </div>
      ))}
    </div>
  );
}
