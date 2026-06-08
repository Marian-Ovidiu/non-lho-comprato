"use client";

import { useActionState, useCallback, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Label as CraftedLabel } from "@/components/crafted";
import { createGoal } from "@/src/actions/goals";
import { cn } from "@/lib/utils";
import { getGoalScopeOptions, type LegacyPersonValue } from "@/src/lib/ui-person";

type FormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
};

type CraftedGoalFormProps = {
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

  return <p className="mt-2 text-sm text-destructive">{message}</p>;
}

export function CraftedGoalForm({ defaultPerson = "" }: CraftedGoalFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const didHandleSuccessRef = useRef(false);
  const refresh = useCallback(() => router.refresh(), [router]);
  const [state, formAction, pending] = useActionState(
    async (_previousState: FormState, formData: FormData) => createGoal(formData),
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
    <form ref={formRef} action={formAction} className="space-y-4">
      {state.message ? (
        <div
          className={cn(
            "border px-4 py-3 text-sm",
            state.success
              ? "border-green/30 text-green"
              : "border-destructive/30 text-destructive",
          )}
          role="status"
          aria-live="polite"
        >
          {state.message}
        </div>
      ) : null}

      <div className="border-y border-line py-3">
        <div className="flex items-center justify-between gap-4">
          <input
            id="title"
            name="title"
            placeholder="Weekend a Lisbona"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-ink-3/70"
            aria-invalid={Boolean(state.errors?.title)}
          />
          <CraftedLabel>Obiettivo</CraftedLabel>
        </div>
        <FieldError message={state.errors?.title} />
      </div>

      <div className="border-y border-line py-3">
        <div className="flex items-center justify-between gap-4">
          <input
            id="targetAmount"
            name="targetAmount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="900"
            className="min-w-0 flex-1 bg-transparent font-num text-[15px] text-foreground outline-none placeholder:text-ink-3/70"
            aria-invalid={Boolean(state.errors?.targetAmount)}
          />
          <CraftedLabel>Importo €</CraftedLabel>
        </div>
        <FieldError message={state.errors?.targetAmount} />
      </div>

      <div className="border-y border-line py-3">
        <div className="flex items-center justify-between gap-4">
          <select
            id="person"
            name="person"
            defaultValue={defaultPerson}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none"
            aria-invalid={Boolean(state.errors?.person)}
          >
            {getGoalScopeOptions().map((option) => (
              <option key={option.value || "GLOBAL"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <CraftedLabel>Di chi</CraftedLabel>
        </div>
        <FieldError message={state.errors?.person} />
      </div>

      <input type="hidden" name="emoji" value="" />

      <button
        type="submit"
        disabled={pending}
        className={cn(
          "flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl text-[15.5px] font-bold",
          "bg-accent text-accent-foreground transition-[opacity,transform] duration-200",
          "active:scale-[0.98] disabled:opacity-60",
        )}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Creazione…
          </>
        ) : (
          "Crea obiettivo"
        )}
      </button>
    </form>
  );
}
