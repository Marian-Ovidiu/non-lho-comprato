"use client";

import { useActionState, useEffect, useRef } from "react";
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

  return <p className="text-sm text-rose-600">{message}</p>;
}

export function PresetForm({ categories }: PresetFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    async (_previousState: FormState, formData: FormData) => {
      return createPreset(formData);
    },
    initialState,
  );

  const hasCategories = categories.length > 0;

  useEffect(() => {
    if (!state.success) {
      return;
    }

    formRef.current?.reset();
    router.refresh();
  }, [router, state.success]);

  return (
    <Card className="border-zinc-200/80 shadow-sm">
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
                  ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900"
                  : "rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900"
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
                placeholder="Caffe evitato"
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
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
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
              <Label htmlFor="person">Di chi e il preset?</Label>
              <select
                id="person"
                name="person"
                defaultValue=""
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                aria-invalid={Boolean(state.errors?.person)}
              >
                <option value="">Entrambi</option>
                <option value="MARIAN">Marian</option>
                <option value="MARTINA">Martina</option>
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

        <CardFooter className="justify-end border-t border-zinc-200/70 bg-zinc-50/50 p-5 sm:p-6">
          <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
            {pending ? "Salvataggio..." : "Salva preset"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
