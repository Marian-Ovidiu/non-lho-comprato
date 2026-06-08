"use client";

import Link from "next/link";
import { useState } from "react";

import {
  CraftedIcon,
  Label,
  Mono,
  ProgressLine,
  Rule,
  Serif,
} from "@/components/crafted";
import { CraftedHabitOccurrenceActions } from "@/src/components/habits/crafted-habit-occurrence-actions";
import { formatCraftedCompact } from "@/src/lib/crafted-money";
import type { CraftedHabitsProps } from "@/src/lib/crafted-habits-build";
import { cn } from "@/lib/utils";

type CraftedHabitsComponentProps = CraftedHabitsProps;

export function CraftedHabits({
  today: initialToday,
  all,
  totalToday,
  habitsNote,
  activeCount,
  monthSaved,
  monthLabel,
}: CraftedHabitsComponentProps) {
  const [today, setToday] = useState(initialToday);

  function handleStatusChange(
    occurrenceId: string,
    nextStatus: "spent" | "avoided" | "skipped",
  ) {
    setToday((current) =>
      current.map((item) =>
        item.id === occurrenceId ? { ...item, status: nextStatus } : item,
      ),
    );
  }

  const liveAvoided = today.filter((item) => item.status === "avoided").length;

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      <section className="px-5 py-7">
        <Label className="mb-4 block">Abitudini — oggi</Label>
        <div className="flex items-baseline gap-2.5">
          <Mono className="text-[clamp(3rem,16vw,4.75rem)] font-semibold leading-[0.84] tracking-[-0.05em]">
            {liveAvoided}
            <span className="text-ink-3">/{totalToday || today.length}</span>
          </Mono>
          <span className="text-lg text-muted-foreground">evitate</span>
        </div>
        {habitsNote ? (
          <Serif className="mt-3.5 block text-[19px] text-muted-foreground">
            {habitsNote}
          </Serif>
        ) : null}
      </section>
      <Rule />

      <section className="px-5 pt-5 pb-1.5">
        <Label>Da tenere d&apos;occhio oggi</Label>
      </section>

      {today.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <Serif className="text-sm text-ink-3">
            Nessuna abitudine attiva per oggi.
          </Serif>
          <Link
            href="#nuova-abitudine"
            className="mt-4 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Crea una nuova abitudine
          </Link>
        </div>
      ) : (
        <div className="px-5">
          {today.map((item, index) => {
            const done = item.status === "avoided";

            return (
              <div key={item.id}>
                <div className="flex items-center gap-3.5 py-3.5">
                  <CraftedIcon
                    name={item.icon}
                    size={20}
                    className={done ? "text-ink-3" : "text-muted-foreground"}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-[15px] font-[450]",
                        done ? "text-muted-foreground" : "text-foreground",
                      )}
                    >
                      {item.name}
                    </p>
                    <Mono className="mt-0.5 block text-[11px] text-ink-3">{item.sub}</Mono>
                  </div>
                  <CraftedHabitOccurrenceActions
                    occurrenceId={item.id}
                    currentStatus={item.status}
                    onStatusChange={(nextStatus) => handleStatusChange(item.id, nextStatus)}
                  />
                </div>
                {index < today.length - 1 ? <Rule soft /> : null}
              </div>
            );
          })}
        </div>
      )}
      <Rule />

      {all.length > 0 ? (
        <>
          <section className="flex items-baseline justify-between px-5 pt-5 pb-1.5">
            <Label>Tutte le tue abitudini</Label>
            <Mono className="text-[11px] text-ink-3">{activeCount} attive</Mono>
          </section>
          <div className="px-5 pb-1">
            {all.map((habit, index) => (
              <div
                key={habit.id}
                className={cn(
                  "py-3",
                  index < all.length - 1 && "border-b border-line-soft",
                )}
              >
                <div className="mb-2.5 flex items-center gap-3">
                  <CraftedIcon name={habit.icon} size={18} className="text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-[450]">{habit.name}</p>
                    <Mono className="mt-0.5 block text-[11px] text-ink-3">{habit.freq}</Mono>
                  </div>
                  <div className="text-right">
                    <Mono className="text-[15px] font-medium whitespace-nowrap">
                      +{formatCraftedCompact(habit.weekSaved)}
                      <span className="text-[11px] text-accent">€</span>
                    </Mono>
                    <Mono className="mt-0.5 block text-[10px] tracking-[0.06em] text-ink-3 uppercase">
                      in totale
                    </Mono>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <ProgressLine value={habit.progressPercent} className="flex-1" />
                  <Mono className="text-[10.5px] whitespace-nowrap text-ink-3">
                    {habit.avoidedLabel}
                  </Mono>
                </div>
              </div>
            ))}
          </div>
          {monthSaved > 0 ? (
            <div className="px-5 py-4 text-center">
              <Serif className="text-sm text-ink-3">
                {formatCraftedCompact(monthSaved)}€ risparmiati dalle abitudini, a{" "}
                {monthLabel}.
              </Serif>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
