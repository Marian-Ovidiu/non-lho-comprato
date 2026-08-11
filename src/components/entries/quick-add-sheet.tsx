"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  LockKeyhole,
  Loader2,
  Plus,
  Receipt,
  Sparkles,
  Users2,
} from "lucide-react";

import { createEntry, deleteEntry, getCategories } from "@/src/actions/entries";
import { useToast } from "@/components/crafted/motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DEFAULT_CATEGORIES } from "@/src/lib/categories";
import { EntryPeopleFields } from "@/src/components/entries/entry-people-fields";
import { ExpenseSuggestionCard } from "@/src/components/entries/expense-suggestion-card";
import { FormFieldError } from "@/src/components/shared/form-field-error";
import { getCurrentWorkspaceMembersAction } from "@/src/actions/workspace";
import {
  getDefaultBeneficiaryUserIds,
  getDefaultPaidByUserId,
  type WorkspaceMemberOption,
} from "@/src/lib/workspace-members";
import { useStreakCelebrationTrigger } from "@/src/hooks/use-streak-celebration-trigger";
import { useExpenseSuggestion } from "@/src/hooks/use-expense-suggestion";
import { triggerHaptic } from "@/src/lib/haptics";
import { trackPostHogEvent } from "@/src/lib/posthog";
import { getBrowserTodayDateKey, shiftDateKey } from "@/src/lib/workspace-dates";
import { toHiddenMoneyValue } from "@/src/components/entries/entry-form-money";
import {
  useTranslations,
} from "@/src/components/language/language-context";
import type { EntryMode, EntrySavingContext } from "@/src/lib/entry-domain";
import type { EntryPaymentModeValue } from "@/src/lib/entry-payment-mode";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
};


type QuickAddState = {
  success: boolean;
  message: string;
  entryId?: string;
  errors?: Record<string, string>;
  isFirstEntryCreated?: boolean;
  isFirstEntryOfDay?: boolean;
  streakFrom?: number;
  streakTo?: number;
};

type QuickAddDraft = {
  title: string;
  categoryId: string;
  amountSpent: string;
  comparisonAmount: string;
  paidByUserId: string;
  beneficiaryUserIds: string[];
  date: string;
};

type QuickAddIntent = "spent" | "comparison" | "joint";

const initialState: QuickAddState = {
  success: false,
  message: "",
  errors: {},
};

function getTodayLocal() {
  return getBrowserTodayDateKey();
}

function getInitialDraft(
  members: WorkspaceMemberOption[],
  currentUserId: string,
): QuickAddDraft {
  const paidByUserId = getDefaultPaidByUserId(members, currentUserId);

  return {
    title: "",
    categoryId: "",
    amountSpent: "",
    comparisonAmount: "",
    paidByUserId,
    beneficiaryUserIds: getDefaultBeneficiaryUserIds(members, paidByUserId),
    date: getTodayLocal(),
  };
}





function getSearchHref(
  draft: QuickAddDraft,
  mode: EntryMode,
  savingContext: EntrySavingContext,
  paymentMode: EntryPaymentModeValue,
  returnTo?: string,
) {
  const params = new URLSearchParams();
  const hiddenAmountSpent = toHiddenMoneyValue(draft.amountSpent);
  const hiddenComparisonAmount =
    savingContext === "comparison"
      ? toHiddenMoneyValue(draft.comparisonAmount)
      : "";

  if (draft.title.trim()) {
    params.set("title", draft.title.trim());
  }

  if (draft.categoryId) {
    params.set("categoryId", draft.categoryId);
  }

  params.set("mode", mode);
  params.set("savingContext", savingContext);
  params.set("paymentMode", paymentMode);

  if (hiddenAmountSpent) {
    params.set("amountSpent", hiddenAmountSpent);
    params.set("realCost", hiddenAmountSpent);
  }

  if (hiddenComparisonAmount) {
    params.set("comparisonAmount", hiddenComparisonAmount);
    params.set("alternativeCost", hiddenComparisonAmount);
  }

  if (draft.paidByUserId) {
    params.set("paidByUserId", draft.paidByUserId);
  }

  if (draft.beneficiaryUserIds.length > 0) {
    params.set("beneficiaryUserIds", draft.beneficiaryUserIds.join(","));
  }

  if (draft.date) {
    params.set("date", draft.date);
  }

  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    params.set("returnTo", returnTo);
  }

  const query = params.toString();
  return query ? `/entries/new?${query}` : "/entries/new";
}

function getQuickAddIntent(
  comparisonEnabled: boolean,
  paymentMode: EntryPaymentModeValue,
): QuickAddIntent {
  if (paymentMode === "joint_account") {
    return "joint";
  }

  return comparisonEnabled ? "comparison" : "spent";
}

function getMoneyDelta(amountSpent: string, comparisonAmount: string): number {
  const amount = Number(amountSpent.replace(",", "."));
  const comparison = Number(comparisonAmount.replace(",", "."));

  if (!Number.isFinite(amount) || !Number.isFinite(comparison)) {
    return 0;
  }

  return Math.round((comparison - amount + Number.EPSILON) * 100) / 100;
}

export function QuickAddSheet({
  categories,
  workspace,
  currentUserId,
  triggerVariant = "default",
}: {
  categories?: CategoryOption[];
  workspace: {
    id: string;
    name: string;
    kind: "private" | "shared";
    isShared: boolean;
  };
  currentUserId: string;
  triggerVariant?: "default" | "crafted";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<WorkspaceMemberOption[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [loadedCategoryState, setLoadedCategoryState] = useState<{
    workspaceId: string;
    categories: CategoryOption[];
  } | null>(null);
  const [draft, setDraft] = useState<QuickAddDraft>(() =>
    getInitialDraft([], currentUserId),
  );
  const titleRef = useRef<HTMLInputElement>(null);
  const didHandleSuccessRef = useRef(false);
  const hasDraftBeenEditedRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const [successStage, setSuccessStage] = useState<"idle" | "confirming" | "closing">(
    "idle",
  );
  const [mode, setMode] = useState<EntryMode>("spent");
  const [paymentMode, setPaymentMode] =
    useState<EntryPaymentModeValue>("single_payer");
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  const [comparisonAmountTouched, setComparisonAmountTouched] = useState(false);
  const { tryTrigger, overlay } = useStreakCelebrationTrigger({
    onComplete: () => router.refresh(),
  });
  const { push: pushToast } = useToast();
  const categoryOptions = useMemo(
    () =>
      (loadedCategoryState?.workspaceId === workspace.id &&
      loadedCategoryState.categories.length > 0
        ? loadedCategoryState.categories
        : categories?.length
          ? categories
          : DEFAULT_CATEGORIES
      ).map((category) =>
        "id" in category
          ? category
          : {
              id: category.slug,
              name: category.name,
              slug: category.slug,
              color: category.color,
              icon: category.icon,
            },
      ),
    [categories, loadedCategoryState, workspace.id],
  );
  const activeMembers = useMemo(
    () =>
      members.length > 0
        ? members
        : [
            {
              userId: currentUserId,
              name: null,
              email: null,
              label: "",
            },
          ],
    [currentUserId, members],
  );
  const canUseJointPayment = workspace.isShared && activeMembers.length === 2;
  const effectivePaymentMode = canUseJointPayment
    ? paymentMode
    : "single_payer";
  const [state, formAction, pending] = useActionState(
    async (_previousState: QuickAddState, formData: FormData) => {
      return createEntry(formData);
    },
    initialState,
  );
  const expenseSuggestion = useExpenseSuggestion({
    title: draft.title,
    categoryId: draft.categoryId,
    workspaceId: workspace.id,
    amountSpent: draft.amountSpent,
    paidByUserId: draft.paidByUserId,
    beneficiaryUserIds: draft.beneficiaryUserIds,
    enabled:
      !comparisonEnabled &&
      !comparisonAmountTouched &&
      draft.amountSpent.trim().length > 0,
  });
  const showSuggestionLookupState = expenseSuggestion.isLoading;
  const todayKey = getTodayLocal();
  const yesterdayKey = shiftDateKey(todayKey, -1);
  const savingContext: EntrySavingContext = comparisonEnabled ? "comparison" : "none";
  const quickAddIntent = getQuickAddIntent(comparisonEnabled, effectivePaymentMode);
  const hiddenAmountSpent = toHiddenMoneyValue(draft.amountSpent);
  const hiddenComparisonAmount = comparisonEnabled
    ? toHiddenMoneyValue(draft.comparisonAmount)
    : "";
  const fullFormHref = useMemo(
    () => getSearchHref(draft, mode, savingContext, effectivePaymentMode, pathname),
    [draft, effectivePaymentMode, mode, pathname, savingContext],
  );
  const suggestion =
    expenseSuggestion.suggestion &&
    expenseSuggestion.suggestion.confidence >= 0.75
      ? expenseSuggestion.suggestion
      : null;
  const comparisonDelta = getMoneyDelta(draft.amountSpent, draft.comparisonAmount);
  const showLargeComparisonWarning =
    comparisonEnabled &&
    draft.comparisonAmount.trim().length > 0 &&
    Math.abs(comparisonDelta) >= 100;

  useEffect(() => {
    let active = true;

    async function loadMembers() {
      try {
        const loadedMembers = await getCurrentWorkspaceMembersAction();

        if (!active) {
          return;
        }

        setMembers(loadedMembers);
      } catch (error) {
        console.error("Failed to load quick-add members:", error);
        pushToast({
          title: "Persone non disponibili",
          description: "Non riesco a caricare i membri del workspace. Riprova tra poco.",
          tone: "error",
          duration: 5200,
        });
      } finally {
        if (active) {
          setMembersLoading(false);
        }
      }
    }

    void loadMembers();

    return () => {
      active = false;
    };
  }, [pushToast]);


  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;

    async function loadCategories() {
      try {
        const loadedCategories = await getCategories();

        if (active) {
          setLoadedCategoryState({
            workspaceId: workspace.id,
            categories: loadedCategories,
          });
        }
      } catch (error) {
        console.error("Failed to load quick-add categories:", error);
        pushToast({
          title: "Categorie non disponibili",
          description: "Non riesco a caricare le categorie. Riprova tra poco.",
          tone: "error",
          duration: 5200,
        });
      }
    }

    void loadCategories();

    return () => {
      active = false;
    };
  }, [open, pushToast, workspace.id]);

  useEffect(() => {
    if (membersLoading || hasDraftBeenEditedRef.current) {
      return;
    }

    setDraft(getInitialDraft(activeMembers, currentUserId));
  }, [activeMembers, currentUserId, membersLoading]);

  useEffect(() => {
    if (!state.success) {
      didHandleSuccessRef.current = false;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuccessStage("idle");
      return;
    }

    if (didHandleSuccessRef.current) {
      return;
    }

    didHandleSuccessRef.current = true;
    trackPostHogEvent("quick_add_saved");
    trackPostHogEvent("entry_created");
    if (state.isFirstEntryCreated) {
      trackPostHogEvent("first_entry_created");
    }

    setSuccessStage("confirming");

    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }

    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
    }

    const showedCelebration = tryTrigger(state);
    if (!showedCelebration) {
      triggerHaptic("light");
    }

    pushToast({
      title: t.quickAdd.successTitle,
      description: t.quickAdd.successDesc,
      tone: "success",
      action: state.entryId
        ? {
            label: t.quickAdd.undoButton,
            onClick: async () => {
              const result = await deleteEntry(state.entryId ?? "");

              pushToast({
                title: result.success
                  ? t.quickAdd.undoSuccess
                  : t.quickAdd.undoFailed,
                description: result.message,
                tone: result.success ? "default" : "error",
                duration: result.success ? 3200 : 5200,
              });

              if (result.success) {
                router.refresh();
              }
            },
          }
        : undefined,
    });

    closeTimerRef.current = window.setTimeout(() => {
      setSuccessStage("closing");
    }, 120);

    refreshTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      hasDraftBeenEditedRef.current = false;
      setMode("spent");
      setPaymentMode("single_payer");
      setComparisonEnabled(false);
      setComparisonAmountTouched(false);
      setDraft(getInitialDraft(activeMembers, currentUserId));

      if (!showedCelebration) {
        router.refresh();
      }
    }, 240);
  }, [
    activeMembers,
    currentUserId,
    pushToast,
    router,
    state,
    t.quickAdd.successDesc,
    t.quickAdd.successTitle,
    t.quickAdd.undoButton,
    t.quickAdd.undoFailed,
    t.quickAdd.undoSuccess,
    tryTrigger,
  ]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }

      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);





  function handleModeChange(nextMode: EntryMode) {
    hasDraftBeenEditedRef.current = true;
    setMode(nextMode === "spent" ? "spent" : "spent");

    setDraft((current) => ({
      ...current,
      amountSpent: current.amountSpent || current.comparisonAmount,
    }));
  }

  function handleIntentChange(nextIntent: QuickAddIntent) {
    handleModeChange("spent");
    setPaymentMode(nextIntent === "joint" ? "joint_account" : "single_payer");
    setComparisonEnabled(nextIntent === "comparison");

    if (nextIntent === "comparison") {
      setComparisonAmountTouched(true);
      setDraft((current) => ({
        ...current,
        comparisonAmount: current.comparisonAmount || current.amountSpent,
      }));
    } else {
      setComparisonAmountTouched(false);
    }

    if (nextIntent === "joint") {
      setDraft((current) => ({
        ...current,
        paidByUserId: activeMembers[0]?.userId ?? current.paidByUserId,
        beneficiaryUserIds: activeMembers.map((member) => member.userId),
      }));
    }
  }

  const handlePaidByUserIdChange = useCallback((value: string) => {
    hasDraftBeenEditedRef.current = true;
    setDraft((current) => ({
      ...current,
      paidByUserId: value,
    }));
  }, []);

  const handleBeneficiaryUserIdsChange = useCallback((value: string[]) => {
    hasDraftBeenEditedRef.current = true;
    setDraft((current) => ({
      ...current,
      beneficiaryUserIds: value,
    }));
  }, []);

  return (
    <>
      {overlay}
      <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (nextOpen) {
        }

        if (!nextOpen) {
          setMode("spent");
          setPaymentMode("single_payer");
          setComparisonEnabled(false);
          setComparisonAmountTouched(false);
          hasDraftBeenEditedRef.current = false;
          setDraft(getInitialDraft(activeMembers, currentUserId));
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant === "crafted" ? "ghost" : "default"}
          size="icon"
          className={
            triggerVariant === "crafted"
              ? "size-10 rounded-full border-[1.5px] border-accent bg-transparent text-accent transition-opacity active:opacity-70"
              : "size-[52px] rounded-full bg-accent text-accent-foreground transition-[transform,opacity] duration-200 ease-[cubic-bezier(.2,.8,.2,1)] active:scale-[0.95] active:opacity-90"
          }
          style={
            triggerVariant === "crafted"
              ? undefined
              : { boxShadow: "var(--shadow-none)" }
          }
          onClick={() => trackPostHogEvent("quick_add_opened")}
        >
          <Plus
            className={triggerVariant === "crafted" ? "size-4" : "size-5"}
            strokeWidth={triggerVariant === "crafted" ? 2 : undefined}
            aria-hidden="true"
          />
          <span className="sr-only">Nuovo movimento</span>
        </Button>
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        /* Senza DialogDescription, Radix cercherebbe un aria-describedby che
           non esiste più: dichiararlo assente evita di puntare al vuoto. */
        aria-describedby={undefined}
        className={cn(
          "inset-x-3 top-auto bottom-0 w-auto max-w-none translate-x-0 translate-y-0 overflow-x-hidden rounded-t-[var(--r-sheet)] rounded-b-none border-border bg-surface p-0 shadow-[var(--shadow-sheet)] data-open:animate-in data-open:slide-in-from-bottom-4 data-closed:animate-out data-closed:slide-out-to-bottom-4 sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-full sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--r-sheet)] sm:data-open:zoom-in-95 sm:data-closed:zoom-out-95",
        )}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
        }}
      >
        <div
          className={cn(
            "max-h-[88vh] min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain transition-[opacity,transform,filter] duration-200 ease-out",
            successStage === "closing" && "opacity-0 translate-y-1 blur-[1px]",
          )}
        >
          <div className="border-b border-border/70 px-4 pb-4 pt-4 sm:px-6 sm:pb-6">
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-1">
                <DialogTitle className="flex items-center gap-2 text-lg tracking-tight">
                  {/* Non lilla: qui non c'è nessuna coppia, c'è una scorciatoia.
                      Il lilla torna a dire una cosa sola. */}
                  <Sparkles className="size-4 text-accent" aria-hidden="true" />
                  {t.quickAdd.dialogTitle}
                </DialogTitle>
                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-transparent px-3 py-1.5">
                  <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted-text">
                    {workspace.isShared ? (
                      <Users2 className="size-3.5" aria-hidden="true" />
                    ) : (
                      <LockKeyhole className="size-3.5" aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0 truncate text-sm font-medium text-foreground">
                    {workspace.name}
                  </span>
                  <span className="shrink-0 rounded-full border border-border/70 bg-surface px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-text">
                    {workspace.isShared ? t.quickAdd.workspaceShared : t.quickAdd.workspacePrivate}
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 gap-1 rounded-full px-2 text-foreground hover:bg-surface-muted"
                onClick={() => setOpen(false)}
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                {t.quickAdd.close}
              </Button>
            </div>
          </div>

          <div className="grid min-w-0 gap-3 px-4 py-4 sm:grid-cols-2 sm:px-6">
            <div className="sm:col-span-2">
              <div className={cn(
                "grid gap-2 rounded-[var(--r-control)] border border-line bg-transparent p-1",
                canUseJointPayment ? "grid-cols-3" : "grid-cols-2",
              )}>
                <button
                  type="button"
                  onClick={() => handleIntentChange("spent")}
                  className={cn(
                    "flex min-h-11 items-center justify-center gap-1.5 border-b-[1.5px] px-2 py-2 text-center text-[12.5px] leading-4 transition-colors sm:text-sm",
                    quickAddIntent === "spent"
                      ? "border-accent text-foreground"
                      : "border-transparent text-ink-3 hover:text-foreground",
                  )}
                  aria-pressed={quickAddIntent === "spent"}
                >
                  <Receipt className="size-4" aria-hidden="true" />
                  Ho speso
                </button>
                <button
                  type="button"
                  onClick={() => handleIntentChange("comparison")}
                  className={cn(
                    "flex min-h-11 items-center justify-center gap-1.5 border-b-[1.5px] px-2 py-2 text-center text-[12.5px] leading-4 transition-colors sm:text-sm",
                    quickAddIntent === "comparison"
                      ? "border-accent text-foreground"
                      : "border-transparent text-ink-3 hover:text-foreground",
                  )}
                  aria-pressed={quickAddIntent === "comparison"}
                  aria-label={t.quickAdd.comparisonToggle}
                >
                  <span className="font-num text-sm" aria-hidden="true">
                    ↘
                  </span>
                  Speso + confronto
                </button>
                {canUseJointPayment ? (
                  <button
                    type="button"
                    onClick={() => handleIntentChange("joint")}
                    className={cn(
                      "flex min-h-11 items-center justify-center gap-1.5 border-b-[1.5px] px-2 py-2 text-center text-[12.5px] leading-4 transition-colors sm:text-sm",
                      quickAddIntent === "joint"
                        ? "border-accent text-foreground"
                        : "border-transparent text-ink-3 hover:text-foreground",
                    )}
                    aria-pressed={quickAddIntent === "joint"}
                  >
                    <Users2 className="size-4" aria-hidden="true" />
                    Pagata insieme
                  </button>
                ) : null}
              </div>
              {quickAddIntent === "joint" ? (
                <p className="mt-2 text-center text-xs leading-5 text-muted-text">
                  {t.entryForm.jointDesc}
                </p>
              ) : null}
            </div>
          </div>

          <form
            action={formAction}
            className="min-w-0 border-t border-border/70 px-4 py-4 sm:px-6"
          >
            <input type="hidden" name="mode" value={mode} />
            <input type="hidden" name="savingContext" value={savingContext} />
            <input type="hidden" name="paymentMode" value={effectivePaymentMode} />
            {hiddenAmountSpent ? (
              <input type="hidden" name="amountSpent" value={hiddenAmountSpent} />
            ) : null}
            {hiddenComparisonAmount ? (
              <input
                type="hidden"
                name="comparisonAmount"
                value={hiddenComparisonAmount}
              />
            ) : null}
            <input type="hidden" name="date" value={draft.date} />
            {workspace.kind === "private" ? (
              <>
                <input
                  type="hidden"
                  name="paidByUserId"
                  value={draft.paidByUserId}
                />
                {draft.beneficiaryUserIds.map((userId) => (
                  <input
                    key={userId}
                    type="hidden"
                    name="beneficiaryUserIds"
                    value={userId}
                  />
                ))}
              </>
            ) : null}

            <div className="min-w-0 space-y-4">
              {state.message ? (
                <div
                  role={state.success ? "status" : "alert"}
                  aria-live={state.success ? "polite" : "assertive"}
                  className={cn(
                    "rounded-[var(--r-control)] border px-4 py-3 text-sm leading-6 transition-[opacity,transform,background-color,border-color,color] duration-200",
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

              <div className="space-y-2">
                <Label htmlFor="quick-title">{t.quickAdd.titleLabel}</Label>
                <Input
                  id="quick-title"
                  className="h-10 rounded-[var(--r-control)] border-line bg-surface-muted px-3 focus-visible:ring-2 focus-visible:ring-ring/50"
                  ref={titleRef}
                  name="title"
                  value={draft.title}
                  onChange={(event) => {
                    hasDraftBeenEditedRef.current = true;
                    setDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }));
                  }}
                  placeholder={t.quickAdd.titlePlaceholder}
                  autoComplete="off"
                  aria-invalid={Boolean(state.errors?.title)}
                />
                <FormFieldError message={state.errors?.title} className="text-sm" />
              </div>

              <div className="grid min-w-0 gap-3 sm:grid-cols-[1.15fr_0.85fr]">
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="quick-category">{t.quickAdd.categoryLabel}</Label>
                  <Select
                    name="categoryId"
                    value={draft.categoryId}
                    onValueChange={(value) => {
                      hasDraftBeenEditedRef.current = true;
                      setDraft((current) => ({
                        ...current,
                        categoryId: value,
                      }));
                    }}
                  >
                    <SelectTrigger
                      id="quick-category"
                      className="h-10 w-full min-w-0 rounded-[var(--r-control)] border-line bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring/50"
                      aria-invalid={Boolean(state.errors?.categoryId)}
                    >
                      <SelectValue placeholder={t.quickAdd.categoryPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormFieldError
                    message={state.errors?.categoryId}
                    className="text-sm"
                  />
                </div>

                <div className="min-w-0 space-y-2">
                  <Label htmlFor="quick-amount">
                    {t.quickAdd.amountLabel}
                  </Label>
                  <Input
                    id="quick-amount"
                    className="h-10 rounded-[var(--r-control)] border-line bg-surface-muted px-3 focus-visible:ring-2 focus-visible:ring-ring/50"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={draft.amountSpent}
                    onChange={(event) => {
                      hasDraftBeenEditedRef.current = true;
                      setDraft((current) => ({
                        ...current,
                        amountSpent: event.target.value,
                      }));
                    }}
                    placeholder="2.00"
                    aria-invalid={Boolean(state.errors?.amountSpent)}
                  />
                  <FormFieldError
                    message={state.errors?.amountSpent}
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="min-w-0 space-y-2">
                <Label htmlFor="quick-date">{t.quickAdd.dateLabel}</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={draft.date === todayKey ? "default" : "outline"}
                    onClick={() => {
                      hasDraftBeenEditedRef.current = true;
                      setDraft((current) => ({ ...current, date: todayKey }));
                    }}
                  >
                    {t.quickAdd.todayButton}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={draft.date === yesterdayKey ? "default" : "outline"}
                    onClick={() => {
                      hasDraftBeenEditedRef.current = true;
                      setDraft((current) => ({ ...current, date: yesterdayKey }));
                    }}
                  >
                    {t.quickAdd.yesterdayButton}
                  </Button>
                </div>
                <div className="min-w-0 overflow-hidden">
                  <Input
                    id="quick-date"
                    type="date"
                    value={draft.date}
                    onChange={(event) => {
                      hasDraftBeenEditedRef.current = true;
                      setDraft((current) => ({
                        ...current,
                        date: event.target.value,
                      }));
                    }}
                    className="h-10 w-full min-w-0 max-w-full rounded-[var(--r-control)] border-line bg-surface-muted px-3 focus-visible:ring-2 focus-visible:ring-ring/50"
                  />
                </div>
              </div>

              <div className="min-w-0 space-y-2">
                <button
                  type="button"
                  className="w-full text-left text-[13px] text-muted-text transition-colors hover:text-foreground"
                  onClick={() => {
                    setPaymentMode("single_payer");
                    setComparisonEnabled((current) => {
                      if (current) {
                        return false;
                      }

                      setDraft((prev) => ({
                        ...prev,
                        comparisonAmount: prev.comparisonAmount || prev.amountSpent,
                      }));
                      return true;
                    });
                  }}
                >
                  {comparisonEnabled
                    ? t.quickAdd.hideComparison
                    : t.quickAdd.comparisonToggle}
                </button>

                {comparisonEnabled ? (
                  <>
                    <Label htmlFor="quick-comparisonAmount">
                      {t.quickAdd.comparisonAmountLabel}
                    </Label>
                    <Input
                      id="quick-comparisonAmount"
                      className="h-10 rounded-[var(--r-control)] border-line bg-surface-muted px-3 focus-visible:ring-2 focus-visible:ring-ring/50"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={draft.comparisonAmount}
                      onChange={(event) => {
                        hasDraftBeenEditedRef.current = true;
                        setComparisonAmountTouched(true);
                        setDraft((current) => ({
                          ...current,
                          comparisonAmount: event.target.value,
                        }));
                      }}
                      placeholder="4.00"
                      aria-invalid={Boolean(state.errors?.comparisonAmount)}
                    />
                    <FormFieldError
                      message={state.errors?.comparisonAmount}
                      className="text-sm"
                    />
                    {showLargeComparisonWarning ? (
                      <p className="rounded-[var(--r-control)] border border-warm/25 bg-warm/5 px-3 py-2 text-xs font-medium leading-5 text-warm">
                        {t.quickAdd.largeComparisonWarning}
                      </p>
                    ) : null}
                  </>
                ) : null}
                {showSuggestionLookupState ? (
                  <p
                    className="flex items-center gap-2 text-xs leading-5 text-muted-text"
                    aria-live="polite"
                  >
                    <Loader2
                      className="size-3.5 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                    {t.quickAdd.searchingSuggestion}
                  </p>
                ) : null}
              </div>

              {suggestion ? (
                <ExpenseSuggestionCard
                  className="mt-4"
                  suggestion={suggestion}
                  onApply={() => {
                    hasDraftBeenEditedRef.current = true;
                    setPaymentMode("single_payer");
                    setComparisonEnabled(true);
                    setComparisonAmountTouched(true);
                    setDraft((current) => ({
                      ...current,
                      comparisonAmount: suggestion.alternativeCost.toFixed(2),
                    }));
                  }}
                />
              ) : null}

              {effectivePaymentMode === "joint_account" ? (
                <div className="rounded-[var(--r-card)] border border-line bg-surface-muted/60 px-4 py-3 text-sm leading-6 text-muted-text">
                  Pagata insieme: l&apos;importo vale per entrambi e il saldo
                  considera metà già pagata da ciascuno.
                </div>
              ) : workspace.kind === "private" ? null : membersLoading ? (
                <p className="text-xs leading-5 text-muted-text" aria-live="polite">
                  {t.quickAdd.loadingMembers}
                </p>
              ) : (
                <EntryPeopleFields
                  key={`${draft.paidByUserId}:${draft.beneficiaryUserIds.join(",")}`}
                  members={activeMembers}
                  paidByUserId={draft.paidByUserId}
                  beneficiaryUserIds={draft.beneficiaryUserIds}
                  errors={state.errors}
                  onPaidByUserIdChange={handlePaidByUserIdChange}
                  onBeneficiaryUserIdsChange={handleBeneficiaryUserIdsChange}
                />
              )}
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row">
              <Button
                type="submit"
                className="h-11 w-full rounded-[var(--r-cta)] px-5 sm:flex-1"
                disabled={
                  pending ||
                  membersLoading ||
                  activeMembers.length === 0 ||
                  !draft.title.trim() ||
                  !draft.categoryId.trim() ||
                  hiddenAmountSpent === "" ||
                  hiddenAmountSpent === "0.00" ||
                  (comparisonEnabled && hiddenComparisonAmount === "")
                }
              >
                {pending ? t.quickAdd.savingButton : t.quickAdd.saveButton}
              </Button>

              <Button asChild variant="outline" className="h-11 w-full rounded-[var(--r-cta)] border-line sm:flex-1">
                <Link href={fullFormHref} onClick={() => setOpen(false)}>
                  {t.quickAdd.fullFormLink}
                </Link>
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
