"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Check, Loader2 } from "lucide-react";

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
import { cn } from "@/lib/utils";
import { EntryPeopleFields } from "@/src/components/entries/entry-people-fields";
import { ExpenseSuggestionCard } from "@/src/components/entries/expense-suggestion-card";
import {
  getDefaultBeneficiaryUserIds,
  getDefaultPaidByUserId,
  type WorkspaceMemberOption,
} from "@/src/lib/workspace-members";
import { useStreakCelebrationTrigger } from "@/src/hooks/use-streak-celebration-trigger";
import { useExpenseSuggestion } from "@/src/hooks/use-expense-suggestion";
import { triggerHaptic } from "@/src/lib/haptics";
import { trackPostHogEvent } from "@/src/lib/posthog";
import { spacing } from "@/src/lib/spacing";

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
  isFirstEntryCreated?: boolean;
  isFirstEntryOfDay?: boolean;
  streakFrom?: number;
  streakTo?: number;
};

type EntryFormProps = {
  categories: CategoryOption[];
  members: WorkspaceMemberOption[];
  currentUserId: string;
  workspaceId: string;
  initialValues?: {
    title?: string;
    categoryId?: string;
    realCost?: string;
    alternativeCost?: string;
    paidByUserId?: string;
    beneficiaryUserIds?: string[];
    date?: string;
  };
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

export function EntryForm({
  categories,
  members,
  currentUserId,
  workspaceId,
  initialValues,
}: EntryFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const didHandleSuccessRef = useRef(false);
  const redirectTimerRef = useRef<number | null>(null);
  const successTimerRef = useRef<number | null>(null);
  const initialPaidByUserId =
    initialValues?.paidByUserId ??
    getDefaultPaidByUserId(members, currentUserId);
  const initialBeneficiaryUserIds =
    initialValues?.beneficiaryUserIds ??
    getDefaultBeneficiaryUserIds(members, initialPaidByUserId);
  const [successStage, setSuccessStage] = useState<"idle" | "confirming" | "closing">(
    "idle",
  );
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [categoryId, setCategoryId] = useState(initialValues?.categoryId ?? "");
  const [realCost, setRealCost] = useState(initialValues?.realCost ?? "");
  const [alternativeCost, setAlternativeCost] = useState(
    initialValues?.alternativeCost ?? "",
  );
  const [paidByUserId, setPaidByUserId] = useState(initialPaidByUserId);
  const [beneficiaryUserIds, setBeneficiaryUserIds] = useState(
    initialBeneficiaryUserIds,
  );
  const alternativeCostTouchedRef = useRef(Boolean(initialValues?.alternativeCost?.trim()));
  const redirect = useCallback((path: string) => router.replace(path), [router]);
  const { tryTrigger, overlay } = useStreakCelebrationTrigger({
    onComplete: () => redirect("/"),
  });
  const expenseSuggestion = useExpenseSuggestion({
    title,
    categoryId,
    workspaceId,
    realCost,
    paidByUserId,
    beneficiaryUserIds,
    enabled:
      !alternativeCostTouchedRef.current &&
      alternativeCost.trim().length === 0,
  });
  const [state, formAction, pending] = useActionState(
    async (_previousState: FormState, formData: FormData) => {
      return createEntry(formData);
    },
    initialState,
  );

  const hasCategories = categories.length > 0;
  const expenseSuggestionValue = expenseSuggestion.suggestion;
  const showSuggestionLookupState = expenseSuggestion.isLoading;
  const isSuggestionAutoApplied =
    expenseSuggestionValue !== null &&
    expenseSuggestionValue.confidence >= 0.75 &&
    !alternativeCostTouchedRef.current &&
    alternativeCost.trim().length > 0 &&
    Math.abs(
      Number(alternativeCost.replace(",", ".")) -
        expenseSuggestionValue.alternativeCost,
    ) < 0.01;

  useEffect(() => {
    if (
      !expenseSuggestionValue ||
      expenseSuggestionValue.confidence < 0.75 ||
      alternativeCostTouchedRef.current ||
      alternativeCost.trim().length > 0
    ) {
      return;
    }

    setAlternativeCost(expenseSuggestionValue.alternativeCost.toFixed(2));
  }, [alternativeCost, expenseSuggestionValue]);

  useEffect(() => {
    if (!state.success) {
      didHandleSuccessRef.current = false;
      setSuccessStage("idle");
      return;
    }

    if (didHandleSuccessRef.current) {
      return;
    }

    didHandleSuccessRef.current = true;
    trackPostHogEvent("entry_created");
    if (state.isFirstEntryCreated) {
      trackPostHogEvent("first_entry_created");
    }

    setSuccessStage("confirming");

    if (successTimerRef.current) {
      window.clearTimeout(successTimerRef.current);
    }

    if (redirectTimerRef.current) {
      window.clearTimeout(redirectTimerRef.current);
    }

    const showedCelebration = tryTrigger(state);
    if (!showedCelebration) {
      triggerHaptic("light");
    }

    successTimerRef.current = window.setTimeout(() => {
      setSuccessStage("closing");
    }, 120);

    if (!showedCelebration) {
      redirectTimerRef.current = window.setTimeout(() => {
        redirect("/");
      }, 320);
    }
  }, [redirect, state, tryTrigger]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        window.clearTimeout(successTimerRef.current);
      }

      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const helperText = useMemo(() => {
    if (!hasCategories) {
      return "Nessuna categoria disponibile. Usa una categoria predefinita o riprova più tardi.";
    }

    return "Compila i campi, poi salviamo il movimento con il risparmio calcolato dal server.";
  }, [hasCategories]);

  return (
    <>
      {overlay}
      <Card
        className={cn(
          "mx-auto w-full max-w-2xl overflow-hidden border-border shadow-sm transition-[opacity,transform,filter] duration-200 ease-out",
          successStage === "closing" && "opacity-0 translate-y-1 blur-[1px]",
        )}
      >
        <CardHeader className={spacing.cardHeader}>
          <CardTitle>Nuovo movimento</CardTitle>
          <CardDescription className="max-w-xl text-sm leading-5">
            {helperText}
          </CardDescription>
        </CardHeader>

        <form ref={formRef} action={formAction}>
          <CardContent className={`space-y-4 ${spacing.cardBody}`}>
            {state.message ? (
              <div
                className={cn(
                  "rounded-2xl border px-4 py-3 text-sm leading-6 transition-[opacity,transform,background-color,border-color,color] duration-200",
                  state.success
                    ? "border-success/20 bg-success/10 text-success"
                    : "border-destructive/20 bg-destructive/10 text-destructive",
                  successStage !== "idle" && "opacity-100",
                )}
              >
                <span className="flex items-start gap-2">
                  {state.success ? (
                    <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  ) : null}
                  <span>{state.message}</span>
                </span>
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
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                aria-invalid={Boolean(state.errors?.title)}
              />
              <FieldError message={state.errors?.title} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId">Categoria</Label>
              <Select
                name="categoryId"
                value={categoryId}
                onValueChange={setCategoryId}
              >
                <SelectTrigger
                  id="categoryId"
                  aria-invalid={Boolean(state.errors?.categoryId)}
                >
                  <SelectValue
                    placeholder={
                      hasCategories ? "Seleziona una categoria" : "Categorie non disponibili"
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

            <EntryPeopleFields
              members={members}
              paidByUserId={paidByUserId}
              beneficiaryUserIds={beneficiaryUserIds}
              errors={state.errors}
              onPaidByUserIdChange={setPaidByUserId}
              onBeneficiaryUserIdsChange={setBeneficiaryUserIds}
            />
          </div>

            <div className="rounded-3xl border border-border bg-surface-muted p-4 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="realCost">Speso davvero</Label>
                <Input
                  id="realCost"
                  name="realCost"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="2.00"
                  value={realCost}
                  onChange={(event) => setRealCost(event.target.value)}
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
                  value={alternativeCost}
                  onChange={(event) => {
                    alternativeCostTouchedRef.current = true;
                    setAlternativeCost(event.target.value);
                  }}
                  aria-invalid={Boolean(state.errors?.alternativeCost)}
                />
                <FieldError message={state.errors?.alternativeCost} />
                {showSuggestionLookupState ? (
                  <p
                    className="flex items-center gap-2 text-xs leading-5 text-muted-text"
                    aria-live="polite"
                  >
                    <Loader2
                      className="size-3.5 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                    Cerco un suggerimento…
                  </p>
                ) : null}
                {isSuggestionAutoApplied ? (
                  <p className="rounded-2xl border border-premium-accent/20 bg-premium-accent/10 px-3 py-2 text-xs font-medium leading-5 text-premium-accent">
                    Suggerito in base alle tue spese in questa categoria
                  </p>
                ) : null}
                <p className="text-xs leading-5 text-muted-text">
                  Usalo solo quando hai scelto un’alternativa più economica a una spesa reale.
                </p>
              </div>
              </div>

              {expenseSuggestionValue ? (
                <div className="mt-4">
                  <ExpenseSuggestionCard
                    suggestion={expenseSuggestionValue}
                    onApply={() => {
                      alternativeCostTouchedRef.current = false;
                      setAlternativeCost(
                        expenseSuggestionValue.alternativeCost.toFixed(2),
                      );
                    }}
                  />
                </div>
              ) : null}

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
                defaultValue={initialValues?.date ?? getTodayLocal()}
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

          <CardFooter className="flex-col gap-3 border-t border-border bg-surface-muted/50 p-4 sm:flex-row sm:justify-end sm:p-6">
            <Button
              type="submit"
              className="h-11 w-full px-5 sm:w-auto"
              disabled={pending || !hasCategories || members.length === 0}
            >
              {pending ? "Salvataggio..." : "Salva movimento"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
}
