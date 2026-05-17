"use client";

import { useActionState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createPreset } from "@/src/actions/presets";
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
import { Textarea } from "@/components/ui/textarea";
import { getPresetPersonOptions } from "@/src/lib/ui-person";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
};

type FormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
};

type PresetFormProps = {
  categories: CategoryOption[];
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

export function PresetForm({ categories }: PresetFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const didHandleSuccessRef = useRef(false);
  const refresh = useCallback(() => router.refresh(), [router]);
  const [state, formAction, pending] = useActionState(
    async (_previousState: FormState, formData: FormData) => {
      return createPreset(formData);
    },
    initialState,
  );

  const hasCategories = categories.length > 0;

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
      <CardHeader className="space-y-2 p-5 pb-0 sm:p-6">
        <CardTitle>Nuovo preset</CardTitle>
        <CardDescription>
          Salva una spesa ricorrente per riusarla al volo.
        </CardDescription>
      </CardHeader>

      <form ref={formRef} action={formAction}>
        <CardContent className="space-y-5 p-5 sm:p-6">
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Titolo</Label>
              <Input
                id="title"
                name="title"
                placeholder="Caffè evitato"
                autoComplete="off"
                aria-invalid={Boolean(state.errors?.title)}
              />
              <FieldError message={state.errors?.title} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="categoryId">Categoria</Label>
              <select
                id="categoryId"
                name="categoryId"
                defaultValue=""
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-border focus:ring-2 focus:ring-border/40"
                aria-invalid={Boolean(state.errors?.categoryId)}
              >
                <option value="" disabled>
                  {hasCategories ? "Seleziona una categoria" : "Nessuna categoria"}
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <FieldError message={state.errors?.categoryId} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="realCost">Costo reale</Label>
              <Input
                id="realCost"
                name="realCost"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="2.50"
                aria-invalid={Boolean(state.errors?.realCost)}
              />
              <FieldError message={state.errors?.realCost} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alternativeCost">Costo alternativo</Label>
              <Input
                id="alternativeCost"
                name="alternativeCost"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="8.00"
                aria-invalid={Boolean(state.errors?.alternativeCost)}
              />
              <FieldError message={state.errors?.alternativeCost} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="person">Di chi è il preset?</Label>
              <select
                id="person"
                name="person"
                defaultValue=""
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-border focus:ring-2 focus:ring-border/40"
                aria-invalid={Boolean(state.errors?.person)}
              >
                {getPresetPersonOptions().map((option) => (
                  <option
                    key={option.value || "DEFAULT"}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
              <FieldError message={state.errors?.person} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="note">Nota</Label>
              <Textarea
                id="note"
                name="note"
                placeholder="Spesso capita dopo pranzo"
                className="min-h-24"
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="justify-end border-t border-border bg-surface-muted/50 p-5 sm:p-6">
          <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
            {pending ? "Salvataggio..." : "Salva preset"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}


