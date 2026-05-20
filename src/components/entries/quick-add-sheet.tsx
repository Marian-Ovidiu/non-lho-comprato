"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  ArrowRight,
  Check,
  LockKeyhole,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Users2,
  X,
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
import {
  getDefaultBeneficiaryUserIds,
  getDefaultPaidByUserId,
  type WorkspaceMemberOption,
} from "@/src/lib/workspace-members";
import { useStreakCelebrationTrigger } from "@/src/hooks/use-streak-celebration-trigger";
import { trackPostHogEvent } from "@/src/lib/posthog";

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
  realCost: string;
  alternativeCost: string;
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
    title: "Caffè evitato",
    categorySlug: "caffe",
    amount: 4,
    rangeLabel: "2 - 5 €",
  },
  {
    id: "delivery",
    emoji: "🍔",
    title: "Delivery saltata",
    categorySlug: "delivery",
    amount: 24,
    rangeLabel: "15 - 30 €",
    shared: true,
  },
  {
    id: "grocery",
    emoji: "🛒",
    title: "Spesa intelligente",
    categorySlug: "spesa",
    amount: 28,
    rangeLabel: "20 - 45 €",
  },
  {
    id: "smoke",
    emoji: "🚬",
    title: "Sigarette non comprate",
    categorySlug: "salute",
    amount: 12,
    rangeLabel: "8 - 15 €",
  },
  {
    id: "shopping",
    emoji: "🛍️",
    title: "Acquisto evitato",
    categorySlug: "shopping",
    amount: 36,
    rangeLabel: "20 - 60 €",
  },
];

function getTodayLocal() {
  return format(new Date(), "yyyy-MM-dd");
}

function getInitialDraft(
  members: WorkspaceMemberOption[],
  currentUserId: string,
): QuickAddDraft {
  const paidByUserId = getDefaultPaidByUserId(members, currentUserId);

  return {
    title: "",
    categoryId: "",
    realCost: "0",
    alternativeCost: "",
    paidByUserId,
    beneficiaryUserIds: getDefaultBeneficiaryUserIds(members, paidByUserId),
    date: getTodayLocal(),
  };
}

function getMoneyValue(amount: number) {
  return amount.toFixed(2);
}

function getSearchHref(draft: QuickAddDraft) {
  const params = new URLSearchParams();

  if (draft.title.trim()) {
    params.set("title", draft.title.trim());
  }

  if (draft.categoryId) {
    params.set("categoryId", draft.categoryId);
  }

  if (draft.realCost) {
    params.set("realCost", draft.realCost);
  }

  if (draft.alternativeCost) {
    params.set("alternativeCost", draft.alternativeCost);
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

  const query = params.toString();
  return query ? `/entries/new?${query}` : "/entries/new";
}

export function QuickAddSheet({
  categories,
  workspace,
  members,
  currentUserId,
}: {
  categories?: CategoryOption[];
  workspace: {
    name: string;
    kind: "private" | "shared";
    isShared: boolean;
  };
  members: WorkspaceMemberOption[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [draft, setDraft] = useState<QuickAddDraft>(() =>
    getInitialDraft(members, currentUserId),
  );
  const firstPresetRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const didHandleSuccessRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const [successStage, setSuccessStage] = useState<"idle" | "confirming" | "closing">(
    "idle",
  );
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
  const [state, formAction, pending] = useActionState(
    async (_previousState: QuickAddState, formData: FormData) => {
      return createEntry(formData);
    },
    initialState,
  );

  const fullFormHref = useMemo(() => getSearchHref(draft), [draft]);

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

    closeTimerRef.current = window.setTimeout(() => {
      setSuccessStage("closing");
    }, 120);

    refreshTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      setActivePreset(null);
      setDraft(getInitialDraft(members, currentUserId));

      if (!showedCelebration) {
        router.refresh();
      }
    }, 240);
  }, [currentUserId, members, router, state, tryTrigger]);

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

    setActivePreset(preset.id);
    const paidByUserId = getDefaultPaidByUserId(members, currentUserId);
    const beneficiaryUserIds = preset.shared
      ? members.map((member) => member.userId)
      : getDefaultBeneficiaryUserIds(members, paidByUserId);

    setDraft({
      title: preset.title,
      categoryId: resolveCategoryId(preset.categorySlug),
      realCost: "0",
      alternativeCost: getMoneyValue(preset.amount),
      paidByUserId,
      beneficiaryUserIds,
      date: getTodayLocal(),
    });
    focusTitleSoon();
  }

  function personalize() {
    setActivePreset("custom");
    setDraft(getInitialDraft(members, currentUserId));
    focusTitleSoon();
  }

  return (
    <>
      {overlay}
      <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (!nextOpen) {
          setActivePreset(null);
          setDraft(getInitialDraft(members, currentUserId));
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className="size-12 -mt-4 rounded-full border border-premium-accent/30 bg-primary text-primary-foreground shadow-lg transition-[transform,background-color,box-shadow,opacity] duration-200 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-px hover:bg-primary-hover active:translate-y-0 active:scale-[0.975] active:opacity-95"
          onClick={() => trackPostHogEvent("quick_add_opened")}
        >
          <Plus className="size-5" aria-hidden="true" />
          <span className="sr-only">Nuovo movimento</span>
        </Button>
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className={cn(
          "left-1/2 top-auto bottom-0 w-[calc(100%-0.75rem)] max-w-none -translate-x-1/2 translate-y-0 rounded-t-[1.75rem] rounded-b-none border-border bg-surface p-0 shadow-[0_-28px_80px_rgba(0,0,0,0.28)] data-open:animate-in data-open:slide-in-from-bottom-4 data-closed:animate-out data-closed:slide-out-to-bottom-4 sm:top-1/2 sm:bottom-auto sm:w-full sm:max-w-xl sm:-translate-y-1/2 sm:rounded-3xl sm:rounded-b-3xl sm:data-open:zoom-in-95 sm:data-closed:zoom-out-95",
        )}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          firstPresetRef.current?.focus();
        }}
      >
        <div
          className={cn(
            "max-h-[88vh] overflow-y-auto overscroll-contain transition-[opacity,transform,filter] duration-200 ease-out",
            successStage === "closing" && "opacity-0 translate-y-1 blur-[1px]",
          )}
        >
          <div className="border-b border-border/70 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
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
                size="icon-sm"
                className="shrink-0 rounded-full text-muted-text hover:bg-surface-muted hover:text-foreground"
                onClick={() => setOpen(false)}
                aria-label="Chiudi"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="grid gap-2.5 px-4 py-4 sm:grid-cols-2 sm:px-5">
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
                  Campi rapidi e selezione libera
                </span>
              </span>

              <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-text" aria-hidden="true" />
            </button>
          </div>

          <form action={formAction} className="border-t border-border/70 px-4 py-4 sm:px-5">
            <input type="hidden" name="realCost" value={draft.realCost} />
            <input type="hidden" name="date" value={draft.date} />

            <div className="space-y-4">
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
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Caffè evitato"
                  autoComplete="off"
                  aria-invalid={Boolean(state.errors?.title)}
                />
                {state.errors?.title ? (
                  <p className="text-sm text-destructive">{state.errors.title}</p>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-2">
                  <Label htmlFor="quick-category">Categoria</Label>
                  <Select
                    name="categoryId"
                    value={draft.categoryId}
                    onValueChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        categoryId: value,
                      }))
                    }
                  >
                    <SelectTrigger
                      id="quick-category"
                      className="w-full"
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
                  {state.errors?.categoryId ? (
                    <p className="text-sm text-destructive">
                      {state.errors.categoryId}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quick-alternativeCost">Costo evitato</Label>
                  <Input
                    id="quick-alternativeCost"
                    name="alternativeCost"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={draft.alternativeCost}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        alternativeCost: event.target.value,
                      }))
                    }
                    placeholder="4.00"
                    aria-invalid={Boolean(state.errors?.alternativeCost)}
                  />
                  {state.errors?.alternativeCost ? (
                    <p className="text-sm text-destructive">
                      {state.errors.alternativeCost}
                    </p>
                  ) : null}
                </div>
              </div>

              <EntryPeopleFields
                key={`${draft.paidByUserId}:${draft.beneficiaryUserIds.join(",")}`}
                members={members}
                paidByUserId={draft.paidByUserId}
                beneficiaryUserIds={draft.beneficiaryUserIds}
                errors={state.errors}
              />
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row">
              <Button
                type="submit"
                className="h-11 w-full px-5 sm:flex-1"
                disabled={
                  pending ||
                  members.length === 0 ||
                  !draft.title.trim() ||
                  !draft.categoryId.trim() ||
                  !draft.alternativeCost.trim()
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
