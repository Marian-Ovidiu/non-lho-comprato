"use client";

import { useActionState, useCallback, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Label } from "@/components/crafted";
import { createPreset } from "@/src/actions/presets";
import { cn } from "@/lib/utils";
import { getPresetPersonOptions } from "@/src/lib/ui-person";

type CategoryOption = {
  id: string;
  name: string;
};

type FormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
};

const initialState: FormState = { success: false, message: "", errors: {} };

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-2 text-sm text-destructive">{message}</p>;
}

export function CraftedPresetForm({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const didHandleSuccessRef = useRef(false);
  const refresh = useCallback(() => router.refresh(), [router]);
  const [state, formAction, pending] = useActionState(
    async (_previousState: FormState, formData: FormData) => createPreset(formData),
    initialState,
  );

  useEffect(() => {
    if (!state.success || didHandleSuccessRef.current) return;
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
            state.success ? "border-green/30 text-green" : "border-destructive/30 text-destructive",
          )}
        >
          {state.message}
        </div>
      ) : null}

      <div className="border-y border-line py-3">
        <div className="flex items-center justify-between gap-4">
          <input
            name="title"
            placeholder="Caffè evitato"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3/70"
          />
          <Label>Titolo</Label>
        </div>
        <FieldError message={state.errors?.title} />
      </div>

      <div className="border-y border-line py-3">
        <div className="flex items-center justify-between gap-4">
          <select
            name="categoryId"
            defaultValue=""
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
          >
            <option value="" disabled>
              Categoria
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <Label>Categoria</Label>
        </div>
        <FieldError message={state.errors?.categoryId} />
      </div>

      <div className="grid gap-0 border-y border-line sm:grid-cols-2 sm:divide-x sm:divide-line">
        <label className="flex items-center justify-between gap-4 py-3 sm:px-4 sm:first:pl-0">
          <input
            name="realCost"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="2,50"
            className="min-w-0 flex-1 bg-transparent font-num text-sm outline-none"
          />
          <Label>Reale</Label>
        </label>
        <label className="flex items-center justify-between gap-4 py-3 sm:px-4 sm:last:pr-0">
          <input
            name="alternativeCost"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="8,00"
            className="min-w-0 flex-1 bg-transparent font-num text-sm outline-none"
          />
          <Label>Alternativo</Label>
        </label>
      </div>

      <div className="border-y border-line py-3">
        <div className="flex items-center justify-between gap-4">
          <select name="person" defaultValue="" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none">
            {getPresetPersonOptions().map((option) => (
              <option key={option.value || "DEFAULT"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Label>Di chi</Label>
        </div>
      </div>

      <div className="border-y border-line py-3">
        <textarea
          name="note"
          rows={2}
          placeholder="Spesso capita dopo pranzo"
          className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-ink-3/70"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-accent text-[15.5px] font-bold text-accent-foreground disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : "Salva preset"}
      </button>
    </form>
  );
}
