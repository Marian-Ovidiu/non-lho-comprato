"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  CircleOff,
  LockKeyhole,
  Loader2,
  Plus,
  Receipt,
  SlidersHorizontal,
  Sparkles,
  Users2,
} from "lucide-react";

import { createEntry } from "@/src/actions/entries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { getCategoryIdentity } from "@/src/lib/category-identity";
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
import { getRomeTodayDateKey, shiftRomeDateKey } from "@/src/lib/rome-dates";
import { toHiddenMoneyValue } from "@/src/components/entries/entry-form-money";
import type { EntryMode, EntrySavingContext } from "@/src/lib/entry-domain";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
};

type QuickAddPreset = {
  id: string;
  emoji: string;
  title: string;
  categorySlug: string;
  amount: number;
  rangeLabel: string;
  shared?: boolean;
};

type QuickAddState = {
  success: boolean;
  message: string;
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

const initialState: QuickAddState = {
  success: false,
  message: "",
  errors: {},
};

const presets: QuickAddPreset[] = [
  {
    id: "coffee",
    emoji: "☕",
    title: "Caffè",
    categorySlug: "caffe",
    amount: 4,
    rangeLabel: "2 - 5 €",
  },
  {
    id: "delivery",
    emoji: "🍔",
    title: "Delivery",
    categorySlug: "delivery",
    amount: 24,
    rangeLabel: "15 - 30 €",
    shared: true,
  },
  {
    id: "grocery",
    emoji: "🛒",
    title: "Spesa",
    categorySlug: "spesa",
    amount: 28,
    rangeLabel: "20 - 45 €",
    shared: true,
  },
  {
    id: "smoke",
    emoji: "🚬",
    title: "Sigarette",
    categorySlug: "salute",
    amount: 12,
    rangeLabel: "8 - 15 €",
  },
  {
    id: "shopping",
    emoji: "🛍️",
    title: "Shopping",
    categorySlug: "shopping",
    amount: 36,
    rangeLabel: "20 - 60 €",
  },
];

function getTodayLocal() {
  return getRomeTodayDateKey();
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

function getMoneyValue(amount: number) {
  return amount.toFixed(2);
}

function getSearchHref(
  draft: QuickAddDraft,
  mode: EntryMode,
  savingContext: EntrySavingContext,
  returnTo?: string,
) {
  const params = new URLSearchParams();
  const hiddenAmountSpent =
    mode === "spent" ? toHiddenMoneyValue(draft.amountSpent) : "";
  const hiddenComparisonAmount =
    mode === "avoided" || savingContext === "comparison"
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

  if (hiddenAmountSpent) {
    params.set("amountSpent", hiddenAmountSpent);
    params.set("realCost", hiddenAmountSpent);
  }

  if (hiddenComparisonAmount) {
    params.set("comparisonAmount", hiddenComparisonAmount);
    params.set("alternativeCost", hiddenComparisonAmount);
  }

  if (mode === "avoided") {
    params.set("realCost", "0.00");
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
  const [open, setOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [members, setMembers] = useState<WorkspaceMemberOption[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [draft, setDraft] = useState<QuickAddDraft>(() =>
    getInitialDraft([], currentUserId),
  );
  const firstPresetRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const didHandleSuccessRef = useRef(false);
  const hasDraftBeenEditedRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const [successStage, setSuccessStage] = useState<"idle" | "confirming" | "closing">(
    "idle",
  );
  const [mode, setMode] = useState<EntryMode>("spent");
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  const [comparisonAmountTouched, setComparisonAmountTouched] = useState(false);
  const { tryTrigger, overlay } = useStreakCelebrationTrigger({
    onComplete: () => router.refresh(),
  });
  const categoryOptions = useMemo(
    () =>
      (categories?.length ? categories : DEFAULT_CATEGORIES).map((category) =>
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
    [categories],
  );
  const presetMap = useMemo(
    () => new Map(presets.map((preset) => [preset.id, preset])),
    [],
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
      mode === "spent" &&
      !comparisonEnabled &&
      !comparisonAmountTouched &&
      draft.amountSpent.trim().length > 0,
  });
  const showSuggestionLookupState = expenseSuggestion.isLoading;
  const todayKey = getTodayLocal();
  const yesterdayKey = shiftRomeDateKey(todayKey, -1);
  const savingContext: EntrySavingContext =
    mode === "avoided" ? "comparison" : comparisonEnabled ? "comparison" : "none";
  const hiddenAmountSpent =
    mode === "spent" ? toHiddenMoneyValue(draft.amountSpent) : "";
  const hiddenComparisonAmount =
    mode === "avoided" || comparisonEnabled
      ? toHiddenMoneyValue(draft.comparisonAmount)
      : "";
  const fullFormHref = useMemo(
    () => getSearchHref(draft, mode, savingContext, pathname),
    [draft, mode, pathname, savingContext],
  );
  const suggestion =
    expenseSuggestion.suggestion &&
    expenseSuggestion.suggestion.confidence >= 0.75
      ? expenseSuggestion.suggestion
      : null;

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
  }, []);

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

    closeTimerRef.current = window.setTimeout(() => {
      setSuccessStage("closing");
    }, 120);

    refreshTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      setActivePreset(null);
      hasDraftBeenEditedRef.current = false;
      setMode("spent");
      setComparisonEnabled(false);
      setComparisonAmountTouched(false);
      setDraft(getInitialDraft(activeMembers, currentUserId));

      if (!showedCelebration) {
        router.refresh();
      }
    }, 240);
  }, [activeMembers, currentUserId, router, state, tryTrigger]);

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

  function resolveCategoryId(categorySlug: string) {
    const bySlug = categoryOptions.find((category) => category.slug === categorySlug);
    if (bySlug) {
      return bySlug.id;
    }

    const byId = categoryOptions.find((category) => category.id === categorySlug);
    return byId?.id ?? categorySlug;
  }

  function focusTitleSoon() {
    window.requestAnimationFrame(() => {
      titleRef.current?.focus();
    });
  }

  function applyPreset(presetId: string) {
    const preset = presetMap.get(presetId);

    if (!preset) {
      return;
    }

    hasDraftBeenEditedRef.current = true;
    setActivePreset(preset.id);
    const paidByUserId = getDefaultPaidByUserId(activeMembers, currentUserId);
    const beneficiaryUserIds = preset.shared
      ? activeMembers.map((member) => member.userId)
      : getDefaultBeneficiaryUserIds(activeMembers, paidByUserId);

    setDraft({
      title: preset.title,
      categoryId: resolveCategoryId(preset.categorySlug),
      amountSpent: mode === "spent" ? getMoneyValue(preset.amount) : "",
      comparisonAmount: mode === "avoided" ? getMoneyValue(preset.amount) : "",
      paidByUserId,
      beneficiaryUserIds,
      date: getTodayLocal(),
    });
    setComparisonEnabled(false);
    setComparisonAmountTouched(mode === "avoided");
    focusTitleSoon();
  }

  function personalize() {
    hasDraftBeenEditedRef.current = true;
    setActivePreset("custom");
    setComparisonEnabled(false);
    setComparisonAmountTouched(false);
    setDraft(getInitialDraft(activeMembers, currentUserId));
    focusTitleSoon();
  }

  function handleModeChange(nextMode: EntryMode) {
    hasDraftBeenEditedRef.current = true;
    setMode(nextMode);
    setActivePreset("custom");

    if (nextMode === "avoided") {
      setComparisonEnabled(false);
      setComparisonAmountTouched(false);
      setDraft((current) => ({
        ...current,
        comparisonAmount: current.comparisonAmount || current.amountSpent,
      }));
      return;
    }

    setDraft((current) => ({
      ...current,
      amountSpent: current.amountSpent || current.comparisonAmount,
    }));
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

        if (!nextOpen) {
          setActivePreset(null);
          setMode("spent");
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
              ? "size-[38px] rounded-full border-[1.5px] border-accent bg-transparent text-accent transition-opacity active:opacity-70"
              : "size-[52px] rounded-full bg-accent text-accent-foreground transition-[transform,box-shadow,opacity] duration-200 ease-[cubic-bezier(.2,.8,.2,1)] active:scale-[0.95] active:opacity-90"
          }
          style={
            triggerVariant === "crafted"
              ? undefined
              : { boxShadow: "0 8px 24px rgba(212,255,58,0.18)" }
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
        className={cn(
          "inset-x-3 top-auto bottom-0 w-auto max-w-none translate-x-0 translate-y-0 overflow-x-hidden rounded-t-[1.75rem] rounded-b-none border-border bg-surface p-0 shadow-[0_-28px_80px_rgba(0,0,0,0.28)] data-open:animate-in data-open:slide-in-from-bottom-4 data-closed:animate-out data-closed:slide-out-to-bottom-4 sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-full sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:rounded-b-3xl sm:data-open:zoom-in-95 sm:data-closed:zoom-out-95",
        )}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          firstPresetRef.current?.focus();
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
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-text">
                  Aggiunta rapida
                </p>
                <DialogTitle className="flex items-center gap-2 text-lg tracking-tight">
                  <Sparkles className="size-4 text-premium-accent" aria-hidden="true" />
                  Nuovo movimento
                </DialogTitle>
                <DialogDescription className="max-w-md text-sm leading-5 text-muted-text">
                  Scorciatoie pronte e salvataggio immediato.
                </DialogDescription>

                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1.5">
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
                    {workspace.isShared ? "Condiviso" : "Privato"}
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
                Chiudi
              </Button>
            </div>
          </div>

          <div className="grid min-w-0 gap-3 px-4 py-4 sm:grid-cols-2 sm:px-6">
            <div className="sm:col-span-2">
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-background p-1">
                <button
                  type="button"
                  onClick={() => handleModeChange("spent")}
                  className={cn(
                    "flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                    mode === "spent"
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground hover:bg-surface-muted",
                  )}
                  aria-pressed={mode === "spent"}
                >
                  <Receipt className="size-4" aria-hidden="true" />
                  Ho speso
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("avoided")}
                  className={cn(
                    "flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                    mode === "avoided"
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground hover:bg-surface-muted",
                  )}
                  aria-pressed={mode === "avoided"}
                >
                  <CircleOff className="size-4" aria-hidden="true" />
                  Non l&apos;ho comprato
                </button>
              </div>
            </div>

            {presets.map((preset, index) => {
              const isActive = activePreset === preset.id;
              const presetIdentity = getCategoryIdentity({
                name: preset.title,
                slug: preset.categorySlug,
              });

              return (
                <button
                  key={preset.id}
                  ref={index === 0 ? firstPresetRef : undefined}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={cn(
                    "flex min-h-20 items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-[transform,background-color,border-color,box-shadow,opacity] duration-200 ease-[cubic-bezier(.2,.8,.2,1)]",
                    "hover:-translate-y-px hover:border-border hover:bg-surface-muted active:translate-y-px active:opacity-95",
                    presetIdentity.subtleSurfaceClassName,
                    isActive &&
                      "border-primary/25 bg-primary/8 ring-1 ring-primary/20",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-2xl text-lg",
                      presetIdentity.markerClassName,
                    )}
                  >
                    {preset.emoji}
                  </span>

                  <span className="min-w-0 flex-1 space-y-0.5">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {preset.title}
                    </span>
                    <span className="block text-xs leading-4 text-muted-text">
                      {preset.rangeLabel}
                    </span>
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={personalize}
              className={cn(
                "flex min-h-20 items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-[transform,background-color,border-color,box-shadow,opacity] duration-200 ease-[cubic-bezier(.2,.8,.2,1)] sm:col-span-2",
                "hover:-translate-y-px hover:border-border hover:bg-surface-muted active:translate-y-px active:opacity-95",
                activePreset === "custom"
                  ? "border-primary/25 bg-primary/8 ring-1 ring-primary/20"
                  : "border-border bg-background",
              )}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-surface-muted text-foreground">
                <SlidersHorizontal className="size-4" aria-hidden="true" />
              </span>

              <span className="min-w-0 flex-1 space-y-0.5">
                <span className="block text-sm font-medium text-foreground">
                  Personalizza
                </span>
                <span className="block text-xs leading-4 text-muted-text">
                  Compila titolo, importo e confronto se serve
                </span>
              </span>

              <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-text" aria-hidden="true" />
            </button>
          </div>

          <form
            action={formAction}
            className="min-w-0 border-t border-border/70 px-4 py-4 sm:px-6"
          >
            <input type="hidden" name="mode" value={mode} />
            <input type="hidden" name="savingContext" value={savingContext} />
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

            <div className="min-w-0 space-y-4">
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

              <div className="space-y-2">
                <Label htmlFor="quick-title">Titolo</Label>
                <Input
                  id="quick-title"
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
                  placeholder={mode === "avoided" ? "Delivery" : "Pranzo"}
                  autoComplete="off"
                  aria-invalid={Boolean(state.errors?.title)}
                />
                <FormFieldError message={state.errors?.title} className="text-sm" />
              </div>

              <div className="grid min-w-0 gap-3 sm:grid-cols-[1.15fr_0.85fr]">
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="quick-category">Categoria</Label>
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
                      className="w-full min-w-0"
                      aria-invalid={Boolean(state.errors?.categoryId)}
                    >
                      <SelectValue placeholder="Categoria" />
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
                    {mode === "avoided" ? "Quanto avresti speso" : "Quanto hai speso"}
                  </Label>
                  <Input
                    id="quick-amount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={
                      mode === "avoided" ? draft.comparisonAmount : draft.amountSpent
                    }
                    onChange={(event) => {
                      hasDraftBeenEditedRef.current = true;
                      setDraft((current) => ({
                        ...current,
                        ...(mode === "avoided"
                          ? { comparisonAmount: event.target.value }
                          : { amountSpent: event.target.value }),
                      }));
                    }}
                    placeholder="2.00"
                    aria-invalid={Boolean(
                      mode === "avoided"
                        ? state.errors?.comparisonAmount
                        : state.errors?.amountSpent,
                    )}
                  />
                  <FormFieldError
                    message={
                      mode === "avoided"
                        ? state.errors?.comparisonAmount
                        : state.errors?.amountSpent
                    }
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="min-w-0 space-y-2">
                <Label>Data</Label>
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
                    Oggi
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
                    Ieri
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
                    className="w-full min-w-0 max-w-full"
                  />
                </div>
              </div>

              {mode === "spent" ? (
                <div className="min-w-0 space-y-2">
                  <button
                    type="button"
                    className="w-full text-left text-[13px] text-muted-text transition-colors hover:text-foreground"
                    onClick={() => {
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
                      ? "Nascondi confronto"
                      : "Aggiungi confronto"}
                  </button>

                  {comparisonEnabled ? (
                    <>
                      <Label htmlFor="quick-comparisonAmount">
                        Quanto sarebbe costato
                      </Label>
                      <Input
                        id="quick-comparisonAmount"
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
                      Cerco un confronto utile…
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-border/70 bg-surface-muted/60 px-4 py-3 text-sm text-muted-text">
                  Qui registri una spesa evitata. Se vuoi solo segnare una spesa normale,
                  torna su <span className="font-medium text-foreground">Ho speso</span>.
                </div>
              )}

              {suggestion ? (
                <ExpenseSuggestionCard
                  className="mt-4"
                  suggestion={suggestion}
                  onApply={() => {
                    hasDraftBeenEditedRef.current = true;
                    setComparisonEnabled(true);
                    setComparisonAmountTouched(true);
                    setDraft((current) => ({
                      ...current,
                      comparisonAmount: suggestion.alternativeCost.toFixed(2),
                    }));
                  }}
                />
              ) : null}

              {membersLoading ? (
                <p className="text-xs leading-5 text-muted-text" aria-live="polite">
                  Carico i membri del workspace…
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
                className="h-11 w-full px-5 sm:flex-1"
                disabled={
                  pending ||
                  membersLoading ||
                  activeMembers.length === 0 ||
                  !draft.title.trim() ||
                  !draft.categoryId.trim() ||
                  (mode === "avoided"
                    ? hiddenComparisonAmount === "" || hiddenComparisonAmount === "0.00"
                    : hiddenAmountSpent === "" ||
                      hiddenAmountSpent === "0.00" ||
                      (comparisonEnabled && hiddenComparisonAmount === ""))
                }
              >
                {pending ? "Salvataggio..." : "Salva"}
              </Button>

              <Button asChild variant="outline" className="h-11 w-full sm:flex-1">
                <Link href={fullFormHref}>Vai al form completo</Link>
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
