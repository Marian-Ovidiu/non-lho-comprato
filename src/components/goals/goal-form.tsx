"use client";

import { useActionState, useCallback, useEffect, useRef } from "react";
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
import { getGoalScopeOptions, type LegacyPersonValue } from "@/src/lib/ui-person";

type FormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
};

type GoalFormProps = {
  defaultPerson?: "" | LegacyPersonValue;
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

  return <p className="text-sm text-destructive">{message}</p>;
}

export function GoalForm({ defaultPerson = "" }: GoalFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const didHandleSuccessRef = useRef(false);
  const refresh = useCallback(() => router.refresh(), [router]);
  const [state, formAction, pending] = useActionState(
    async (_previousState: FormState, formData: FormData) => {
      return createGoal(formData);
    },
    initialState,
  );

  useEffect(() => {
    if (!state.success) {
      didHandleSuccessRef.current = false;
      return;
    }

    if (didHandleSuccessRef.current) {
      return;
    }

    didHandleSuccessRef.current = true;

    formRef.current?.reset();
    refresh();
  }, [refresh, state.success]);

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="p-4 pb-0 sm:p-5">
        <CardTitle>Nuovo obiettivo</CardTitle>
        <CardDescription className="text-sm leading-5">
          Scegli una meta e un importo da raggiungere con i risparmi.
        </CardDescription>
      </CardHeader>

      <form ref={formRef} action={formAction}>
        <CardContent className="space-y-4 p-4 sm:p-5">
          {state.message ? (
            <div
              className={
                state.success
                  ? "rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm leading-6 text-success"
                  : "rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm leading-6 text-destructive"
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
                defaultValue={defaultPerson}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-border focus:ring-2 focus:ring-border/40"
                aria-invalid={Boolean(state.errors?.person)}
              >
                {getGoalScopeOptions().map((option) => (
                  <option key={option.value || "GLOBAL"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-text">
                In un workspace condiviso partiamo da una meta condivisa; negli altri casi
                resta globale.
              </p>
              <FieldError message={state.errors?.person} />
            </div>
          </div>
        </CardContent>

        <CardFooter className="justify-end border-t border-border bg-surface-muted/50 p-4 sm:p-5">
          <p className="mr-auto hidden text-xs text-muted-text sm:block">
            Gli obiettivi partono attivi.
          </p>
          <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
            {pending ? "Creazione..." : "Crea obiettivo"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
