"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef } from "react";
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
import { DEFAULT_LEGACY_PERSON } from "@/src/lib/ui-person";
import { PersonSegmentedSelector } from "@/src/components/entries/person-segmented-selector";

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

  return <p className="text-sm text-destructive">{message}</p>;
}

export function EntryForm({ categories }: EntryFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const didHandleSuccessRef = useRef(false);
  const redirect = useCallback((path: string) => router.replace(path), [router]);
  const [state, formAction, pending] = useActionState(
    async (_previousState: FormState, formData: FormData) => {
      return createEntry(formData);
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

    const timeout = window.setTimeout(() => {
      redirect("/");
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [redirect, state.success]);

  const helperText = useMemo(() => {
    if (!hasCategories) {
      return "Nessuna categoria disponibile al momento.";
    }

    return "Compila i campi, poi salviamo il movimento con il risparmio calcolato dal server.";
  }, [hasCategories]);

  return (
    <Card className="mx-auto w-full max-w-2xl overflow-hidden border-border shadow-sm">
      <CardHeader className="space-y-1.5 p-4 pb-0 sm:p-5">
        <CardTitle>Nuovo movimento</CardTitle>
        <CardDescription className="max-w-xl text-sm leading-5">
          {helperText}
        </CardDescription>
      </CardHeader>

      <form ref={formRef} action={formAction}>
        <CardContent className="space-y-5 p-4 sm:p-5">
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
              <FieldError message={state.errors?.categoryId} />
            </div>

            <fieldset className="space-y-2.5">
              <legend className="text-sm font-medium text-foreground">
                Chi ha fatto la spesa?
              </legend>
              <PersonSegmentedSelector defaultValue={DEFAULT_LEGACY_PERSON} />
              <FieldError message={state.errors?.person} />
            </fieldset>
          </div>

          <div className="rounded-3xl border border-border bg-surface-muted p-4 sm:p-5">
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
                <FieldError message={state.errors?.alternativeCost} />
              </div>
            </div>

            <p className="mt-2 text-xs leading-5 text-muted-text">
              Il risparmio finale viene calcolato dal server.
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
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-3 border-t border-border bg-surface-muted/50 p-4 sm:flex-row sm:justify-end sm:p-5">
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

