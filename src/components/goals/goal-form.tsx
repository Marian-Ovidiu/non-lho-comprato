"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createGoal } from "@/src/actions/goals";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GOAL_SCOPE_LABELS } from "@/src/lib/person-labels";

type FormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
};

const initialState: FormState = {
  success: false,
  message: "",
  errors: {},
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-rose-600">{message}</p>;
}

export function GoalForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    async (_previousState: FormState, formData: FormData) => {
      return createGoal(formData);
    },
    initialState,
  );

  useEffect(() => {
    if (!state.success) {
      return;
    }

    formRef.current?.reset();
    router.refresh();
  }, [router, state.success]);

  return (
    <Card className="border-zinc-200/80 shadow-sm">
      <CardHeader className="p-5 pb-0 sm:p-6">
        <CardTitle>Nuovo obiettivo</CardTitle>
        <CardDescription>
          Scegli una meta e un importo da raggiungere con i risparmi.
        </CardDescription>
      </CardHeader>

      <form ref={formRef} action={formAction}>
        <CardContent className="space-y-5 p-5 sm:p-6">
          {state.message ? (
            <div
              className={
                state.success
                  ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900"
                  : "rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900"
              }
            >
              {state.message}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Obiettivo</Label>
              <Input
                id="title"
                name="title"
                placeholder="Weekend a Lisbona"
                autoComplete="off"
                aria-invalid={Boolean(state.errors?.title)}
              />
              <FieldError message={state.errors?.title} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetAmount">Importo da raggiungere</Label>
              <Input
                id="targetAmount"
                name="targetAmount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="400.00"
                aria-invalid={Boolean(state.errors?.targetAmount)}
              />
              <FieldError message={state.errors?.targetAmount} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emoji">Emoji</Label>
              <Input
                id="emoji"
                name="emoji"
                placeholder="✈️"
                autoComplete="off"
                maxLength={4}
                aria-invalid={Boolean(state.errors?.emoji)}
              />
              <FieldError message={state.errors?.emoji} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="person">Di chi è l&apos;obiettivo?</Label>
              <select
                id="person"
                name="person"
                defaultValue=""
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                aria-invalid={Boolean(state.errors?.person)}
              >
                <option value="">{GOAL_SCOPE_LABELS.GLOBAL}</option>
                <option value="MARIAN">{GOAL_SCOPE_LABELS.MARIAN}</option>
                <option value="MARTINA">{GOAL_SCOPE_LABELS.MARTINA}</option>
                <option value="TUTTI">{GOAL_SCOPE_LABELS.TUTTI}</option>
              </select>
              <FieldError message={state.errors?.person} />
            </div>
          </div>
        </CardContent>

        <CardFooter className="justify-end border-t border-zinc-200/70 bg-zinc-50/50 p-5 sm:p-6">
          <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
            {pending ? "Creazione..." : "Crea obiettivo"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
