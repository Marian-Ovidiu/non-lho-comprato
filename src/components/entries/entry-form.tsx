"use client";

import { useActionState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

import { createEntry } from "@/src/actions/entries";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PERSON_OWNERSHIP_LABELS } from "@/src/lib/person-labels";

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

type EntryFormProps = {
  categories: CategoryOption[];
};

const initialState: FormState = {
  success: false,
  message: "",
  errors: {},
};

function getTodayLocal() {
  return format(new Date(), "yyyy-MM-dd");
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-rose-600">{message}</p>;
}

export function EntryForm({ categories }: EntryFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    async (_previousState: FormState, formData: FormData) => {
      return createEntry(formData);
    },
    initialState,
  );

  const hasCategories = categories.length > 0;

  useEffect(() => {
    if (!state.success) {
      return;
    }

    const timeout = window.setTimeout(() => {
      router.replace("/");
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [router, state.success]);

  const helperText = useMemo(() => {
    if (!hasCategories) {
      return "Nessuna categoria disponibile al momento.";
    }

    return "Compila i campi, poi salviamo il movimento con il risparmio calcolato dal server.";
  }, [hasCategories]);

  return (
    <Card className="mx-auto w-full max-w-2xl overflow-hidden border-zinc-200/80 shadow-sm">
      <CardHeader className="space-y-2 p-5 pb-0 sm:p-6">
        <CardTitle>Nuovo movimento</CardTitle>
        <CardDescription className="max-w-xl leading-6">
          {helperText}
        </CardDescription>
      </CardHeader>

      <form ref={formRef} action={formAction}>
        <CardContent className="space-y-6 p-5 sm:p-6">
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

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titolo</Label>
              <Input
                id="title"
                name="title"
                placeholder="Pranzo a casa"
                autoComplete="off"
                aria-invalid={Boolean(state.errors?.title)}
              />
              <p className="text-xs text-zinc-500">
                Un nome veloce e chiaro ti aiuta a ritrovare il movimento in un attimo.
              </p>
              <FieldError message={state.errors?.title} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId">Categoria</Label>
              <Select name="categoryId" defaultValue="">
                <SelectTrigger
                  id="categoryId"
                  aria-invalid={Boolean(state.errors?.categoryId)}
                >
                  <SelectValue
                    placeholder={
                      hasCategories ? "Seleziona una categoria" : "Nessuna categoria"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-500">
                Le categorie servono per capire dove stai schivando più spese.
              </p>
              <FieldError message={state.errors?.categoryId} />
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-zinc-950">
                Chi ha fatto la spesa?
              </legend>
              <div className="grid gap-3 sm:grid-cols-3">
                <Label
                  htmlFor="person-marian"
                  className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-normal shadow-sm transition-colors hover:bg-zinc-50"
                >
                  <input
                    id="person-marian"
                    name="person"
                    type="radio"
                    value="MARIAN"
                    defaultChecked
                    className="h-4 w-4 accent-zinc-950"
                  />
                  <span>{PERSON_OWNERSHIP_LABELS.MARIAN}</span>
                </Label>

                <Label
                  htmlFor="person-martina"
                  className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-normal shadow-sm transition-colors hover:bg-zinc-50"
                >
                  <input
                    id="person-martina"
                    name="person"
                    type="radio"
                    value="MARTINA"
                    className="h-4 w-4 accent-zinc-950"
                  />
                  <span>{PERSON_OWNERSHIP_LABELS.MARTINA}</span>
                </Label>

                <Label
                  htmlFor="person-tutti"
                  className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-normal shadow-sm transition-colors hover:bg-zinc-50"
                >
                  <input
                    id="person-tutti"
                    name="person"
                    type="radio"
                    value="TUTTI"
                    className="h-4 w-4 accent-zinc-950"
                  />
                  <span>{PERSON_OWNERSHIP_LABELS.TUTTI}</span>
                </Label>
              </div>
              <FieldError message={state.errors?.person} />
            </fieldset>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-zinc-50/70 p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="realCost">Quanto hai speso davvero</Label>
                <Input
                  id="realCost"
                  name="realCost"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="2.00"
                  aria-invalid={Boolean(state.errors?.realCost)}
                />
                <p className="text-xs text-zinc-500">
                  Inserisci la spesa reale in euro.
                </p>
                <FieldError message={state.errors?.realCost} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alternativeCost">Quanto avresti speso</Label>
                <Input
                  id="alternativeCost"
                  name="alternativeCost"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="18.00"
                  aria-invalid={Boolean(state.errors?.alternativeCost)}
                />
                <p className="text-xs text-zinc-500">
                  Il valore alternativo che stai evitando.
                </p>
                <FieldError message={state.errors?.alternativeCost} />
              </div>
            </div>

            <p className="mt-3 text-xs leading-5 text-zinc-500">
              Il risparmio finale viene calcolato dal server, così non devi fare conti a mano.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={getTodayLocal()}
              aria-invalid={Boolean(state.errors?.date)}
            />
            <p className="text-xs text-zinc-500">
              Di solito basta la data di oggi, ma puoi correggerla in un secondo.
            </p>
            <FieldError message={state.errors?.date} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Nota</Label>
            <Textarea
              id="note"
              name="note"
              placeholder="Pasta al tonno invece di delivery"
              className="min-h-28"
            />
            <p className="text-xs text-zinc-500">
              Facoltativa: utile quando vuoi ricordarti il contesto.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-3 border-t border-zinc-200/70 bg-zinc-50/50 p-5 sm:flex-row sm:justify-end sm:p-6">
          <Button
            type="submit"
            className="h-11 w-full px-5 sm:w-auto"
            disabled={pending || !hasCategories}
          >
            {pending ? "Salvataggio..." : "Salva movimento"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
