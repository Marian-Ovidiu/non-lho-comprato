"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useActionState,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Loader2,
  LockKeyhole,
  Plus,
  Receipt,
  Users2,
  X,
} from "lucide-react";

import { createEntry, deleteEntry, getCategories } from "@/src/actions/entries";
import { CraftedIcon, Eyebrow } from "@/components/crafted";
import { useToast } from "@/components/crafted/motion";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DEFAULT_CATEGORIES } from "@/src/lib/categories";
import { getCategoryCraftedIcon } from "@/src/lib/category-crafted-icon";
import { getCategoryIdentity } from "@/src/lib/category-identity";
import { EntryPeopleFields } from "@/src/components/entries/entry-people-fields";
import { ExpenseSuggestionCard } from "@/src/components/entries/expense-suggestion-card";
import { FormFieldError } from "@/src/components/shared/form-field-error";
/* La grammatica del pannello vive fuori da qui: è nata in questo file, ma
   adesso i fogli sono tre (aggiunta rapida, saldo, entrata) e la stessa forma
   scritta in tre posti è la condizione da cui nascono le divergenze. */
import {
  DateSegmentedRow,
  PANEL_BODY_CLASS,
  PANEL_CTA_CLASS,
  PANEL_MONEY_INPUT_CLASS,
  PANEL_MONEY_SYMBOL_CLASS,
  PANEL_SHEET_CLASS,
  PANEL_SLAB_CLASS,
  segmentClassName,
  segmentGroupClassName,
} from "@/src/components/shared/panel-grammar";
import { useKeyboardInset } from "@/src/hooks/use-keyboard-inset";
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
import {
  getBrowserTodayDateKey,
  isDateKey,
} from "@/src/lib/workspace-dates";
import {
  normalizeMoneyInput,
  toHiddenMoneyValue,
} from "@/src/components/entries/entry-form-money";
import { useCurrencySymbol } from "@/src/components/currency/currency-context";
import { useLocaleFormatters } from "@/src/components/language/use-locale-formatters";
import { useTranslations } from "@/src/components/language/language-context";
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
  paidByUserId: string;
  beneficiaryUserIds: string[];
  date: string;
};

const initialState: QuickAddState = {
  success: false,
  message: "",
  errors: {},
};

/* Il pannello registra una spesa e basta: il confronto è uscito di qui e vive
   nel form completo. Restano costanti, non stati, perché non c'è più niente
   che le faccia cambiare. */
const QUICK_ADD_MODE = "spent";
const QUICK_ADD_SAVING_CONTEXT = "none";

/* Durata della scivolata fra i due passi. Sotto i 200ms il gruppo che esce non
   si vede uscire (e allora tanto vale non animarlo); sopra i 350 il pannello
   comincia a farsi aspettare su un gesto che si ripete dieci volte al giorno. */
const STEP_MOTION_MS = 280;

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
    paidByUserId,
    beneficiaryUserIds: getDefaultBeneficiaryUserIds(members, paidByUserId),
    date: getTodayLocal(),
  };
}

function getSearchHref(
  draft: QuickAddDraft,
  paymentMode: EntryPaymentModeValue,
  options: { comparisonAmount?: number; returnTo?: string } = {},
) {
  const params = new URLSearchParams();
  const hiddenAmountSpent = toHiddenMoneyValue(draft.amountSpent);
  const hiddenComparisonAmount =
    typeof options.comparisonAmount === "number"
      ? options.comparisonAmount.toFixed(2)
      : "";

  if (draft.title.trim()) {
    params.set("title", draft.title.trim());
  }

  if (draft.categoryId) {
    params.set("categoryId", draft.categoryId);
  }

  params.set("mode", QUICK_ADD_MODE);
  params.set(
    "savingContext",
    hiddenComparisonAmount ? "comparison" : QUICK_ADD_SAVING_CONTEXT,
  );
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

  const returnTo = options.returnTo;
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
  const t = useTranslations();
  const currencySymbol = useCurrencySymbol();
  const { locale } = useLocaleFormatters();
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
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const stepNodesRef = useRef<Record<number, HTMLDivElement | null>>({});
  const lastHandledStateRef = useRef<QuickAddState | null>(null);
  const hasDraftBeenEditedRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const focusTimerRef = useRef<number | null>(null);
  const shouldFocusStepRef = useRef(false);
  const [successStage, setSuccessStage] = useState<"idle" | "confirming" | "closing">(
    "idle",
  );
  const [step, setStep] = useState(1);
  const [viewportHeight, setViewportHeight] = useState<number | undefined>(
    undefined,
  );
  const keyboardInset = useKeyboardInset(open);
  const [liveMessage, setLiveMessage] = useState("");
  /* Quale dei due pulsanti ha inviato: decide se dopo il salvataggio il
     pannello si chiude o si svuota e resta. */
  const [savingIntent, setSavingIntent] = useState<"save" | "saveAndNew">(
    "save",
  );
  const [paymentMode, setPaymentMode] =
    useState<EntryPaymentModeValue>("single_payer");
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
  const effectivePaymentMode = canUseJointPayment ? paymentMode : "single_payer";

  /* Due passi esistono solo dove esiste la seconda domanda. In uno spazio
     privato "chi ha pagato per chi" non ha soggetti: il secondo passo si
     ridurrebbe alla data, cioè a un corridoio verso un campo già compilato. */
  const isTwoStep = workspace.isShared;
  const totalSteps = isTwoStep ? 2 : 1;
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
    enabled: draft.amountSpent.trim().length > 0,
  });
  const showSuggestionLookupState = expenseSuggestion.isLoading;
  const todayKey = getTodayLocal();
  const hiddenAmountSpent = toHiddenMoneyValue(draft.amountSpent);
  const suggestion =
    expenseSuggestion.suggestion &&
    expenseSuggestion.suggestion.confidence >= 0.75
      ? expenseSuggestion.suggestion
      : null;
  const fullFormHref = useMemo(
    () => getSearchHref(draft, effectivePaymentMode, { returnTo: pathname }),
    [draft, effectivePaymentMode, pathname],
  );
  const suggestionHref = useMemo(
    () =>
      suggestion
        ? getSearchHref(draft, effectivePaymentMode, {
            comparisonAmount: suggestion.alternativeCost,
            returnTo: pathname,
          })
        : fullFormHref,
    [draft, effectivePaymentMode, fullFormHref, pathname, suggestion],
  );
  const selectedCategory = categoryOptions.find(
    (category) => category.id === draft.categoryId,
  );

  /* Le tre condizioni del primo passo sono le stesse che il server verifica —
     titolo di almeno due caratteri, categoria, importo maggiore di zero. Il
     pulsante di avanzamento non inventa una regola: mostra prima quella che
     esiste già. */
  const isTitleReady = draft.title.trim().length >= 2;
  const isCategoryReady = draft.categoryId.trim().length > 0;
  const isAmountReady =
    hiddenAmountSpent !== "" && hiddenAmountSpent !== "0.00";
  const isStepOneReady = isTitleReady && isCategoryReady && isAmountReady;
  const canSubmit =
    isStepOneReady &&
    isDateKey(draft.date) &&
    !pending &&
    !membersLoading &&
    activeMembers.length > 0;

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

  /* L'altezza del pannello segue il gruppo attivo, e lo fa con la stessa curva
     della scivolata: i due passi non sono alti uguale, e far finta di sì
     vorrebbe dire lasciare un vuoto sotto il più corto. */
  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    let frame = 0;
    let observer: ResizeObserver | null = null;

    /* Il contenuto del dialog vive in un portale: al primo giro il nodo può
       non essere ancora agganciato, e rinunciando lì l'altezza non verrebbe
       più misurata: con `overflow-hidden` un contenitore rimasto a zero non
       mostra niente. Per la stessa ragione una misura nulla non viene mai
       scritta — se non sappiamo quanto è alto il gruppo, meglio lasciarlo
       crescere da solo che ritagliarlo via. */
    const attach = () => {
      const node = stepNodesRef.current[step];

      if (!node) {
        frame = requestAnimationFrame(attach);
        return;
      }

      const update = () => {
        const height = node.getBoundingClientRect().height;
        setViewportHeight(height > 0 ? height : undefined);
      };

      update();

      observer = new ResizeObserver(update);
      observer.observe(node);
    };

    attach();

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [open, step]);

  useEffect(() => {
    if (!shouldFocusStepRef.current) {
      return;
    }

    shouldFocusStepRef.current = false;
    stepHeadingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (!state.success) {
      if (lastHandledStateRef.current !== state) {
        lastHandledStateRef.current = state;
        setSuccessStage("idle");
      }

      return;
    }

    if (lastHandledStateRef.current === state) {
      return;
    }

    lastHandledStateRef.current = state;
    trackPostHogEvent("quick_add_saved");
    trackPostHogEvent("entry_created");
    if (state.isFirstEntryCreated) {
      trackPostHogEvent("first_entry_created");
    }

    const keepOpen = savingIntent === "saveAndNew";

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
      description: keepOpen
        ? t.quickAdd.savedKeepGoing
        : t.quickAdd.successDesc,
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

    if (keepOpen) {
      /* Si resta dentro. Cambia quello che cambia da uno scontrino all'altro —
         titolo, importo, categoria — e resta quello che di solito non cambia:
         il giorno che stai registrando e chi ha pagato per chi. */
      /* eslint-disable react-hooks/set-state-in-effect --
         l'esito di una server action arriva qui e da nessun'altra parte:
         svuotare la bozza è la reazione a un evento esterno, non un calcolo
         che si possa fare durante il render. */
      setStep(1);
      setLiveMessage(t.quickAdd.savedKeepGoing);
      setDraft((current) => ({
        ...current,
        title: "",
        categoryId: "",
        amountSpent: "",
      }));
      /* eslint-enable react-hooks/set-state-in-effect */
      hasDraftBeenEditedRef.current = true;

      if (focusTimerRef.current) {
        window.clearTimeout(focusTimerRef.current);
      }

      focusTimerRef.current = window.setTimeout(() => {
        titleRef.current?.focus();
      }, STEP_MOTION_MS);

      if (!showedCelebration) {
        router.refresh();
      }

      return;
    }

    setSuccessStage("confirming");

    closeTimerRef.current = window.setTimeout(() => {
      setSuccessStage("closing");
    }, 120);

    refreshTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      hasDraftBeenEditedRef.current = false;
      setStep(1);
      setPaymentMode("single_payer");
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
    savingIntent,
    state,
    t.quickAdd.savedKeepGoing,
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

      if (focusTimerRef.current) {
        window.clearTimeout(focusTimerRef.current);
      }
    };
  }, []);

  function goToStep(nextStep: number) {
    shouldFocusStepRef.current = true;
    setStep(nextStep);
  }

  /* Invio dentro il primo gruppo non manda niente al server: porta avanti, che
     è quello che promette il tasto della tastiera. */
  function handleStepOneEnter(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (isTwoStep && step === 1 && isStepOneReady) {
      goToStep(2);
    }
  }

  function updateDraft(patch: Partial<QuickAddDraft>) {
    hasDraftBeenEditedRef.current = true;
    setDraft((current) => ({ ...current, ...patch }));
  }

  function handlePaymentModeChange(nextMode: EntryPaymentModeValue) {
    hasDraftBeenEditedRef.current = true;
    setPaymentMode(nextMode);

    if (nextMode === "joint_account") {
      setDraft((current) => ({
        ...current,
        paidByUserId: activeMembers[0]?.userId ?? current.paidByUserId,
        beneficiaryUserIds: activeMembers.map((member) => member.userId),
      }));
      return;
    }

    setDraft((current) => {
      const paidByUserId = getDefaultPaidByUserId(activeMembers, currentUserId);

      return {
        ...current,
        paidByUserId,
        beneficiaryUserIds: getDefaultBeneficiaryUserIds(
          activeMembers,
          paidByUserId,
        ),
      };
    });
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

  function renderDateRow() {
    return (
      <DateSegmentedRow
        value={draft.date}
        onChange={(next) => updateDraft({ date: next })}
        todayKey={todayKey}
        locale={locale}
        labels={{
          row: t.quickAdd.whenLabel,
          group: t.quickAdd.dateLabel,
          today: t.quickAdd.todayButton,
          yesterday: t.quickAdd.yesterdayButton,
          other: t.quickAdd.otherDateButton,
          otherAria: t.quickAdd.otherDateLabel,
        }}
      />
    );
  }

  function renderStepOneFields() {
    return (
      <div className={PANEL_SLAB_CLASS}>
        <div className="px-3.5 py-2.5">
          <label htmlFor="quick-title" className="sr-only">
            {t.quickAdd.titleLabel}
          </label>
          <input
            id="quick-title"
            ref={titleRef}
            name="title"
            value={draft.title}
            onChange={(event) => updateDraft({ title: event.target.value })}
            placeholder={t.quickAdd.titlePlaceholder}
            autoComplete="off"
            enterKeyHint={isTwoStep ? "next" : "done"}
            onKeyDown={handleStepOneEnter}
            aria-invalid={Boolean(state.errors?.title)}
            className={cn(
              "h-9 w-full min-w-0 bg-transparent text-[16px] font-medium text-foreground outline-none",
              "placeholder:font-normal placeholder:text-ink-3/75",
              "focus-visible:ring-0",
            )}
          />
          <FormFieldError message={state.errors?.title} className="text-xs" />
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_1px_minmax(0,1.05fr)]">
          <div className="min-w-0 px-3.5 py-2.5">
            <label htmlFor="quick-amount" className="block">
              <Eyebrow className="text-muted-foreground">
                {t.quickAdd.amountShortLabel}
              </Eyebrow>
            </label>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className={PANEL_MONEY_SYMBOL_CLASS} aria-hidden="true">
                {currencySymbol}
              </span>
              <input
                id="quick-amount"
                type="text"
                inputMode="decimal"
                value={draft.amountSpent}
                onChange={(event) =>
                  updateDraft({
                    amountSpent: normalizeMoneyInput(event.target.value),
                  })
                }
                placeholder="0,00"
                enterKeyHint={isTwoStep ? "next" : "done"}
                onKeyDown={handleStepOneEnter}
                aria-invalid={Boolean(state.errors?.amountSpent)}
                className={cn(PANEL_MONEY_INPUT_CLASS, "w-full")}
              />
            </div>
            <FormFieldError
              message={state.errors?.amountSpent}
              className="text-xs"
            />
          </div>

          <div className="my-2.5 w-px bg-line" aria-hidden="true" />

          <div className="min-w-0 px-3.5 py-2.5">
            <label htmlFor="quick-category" className="block">
              <Eyebrow className="text-muted-foreground">
                {t.quickAdd.categoryLabel}
              </Eyebrow>
            </label>
            <Select
              name="categoryId"
              value={draft.categoryId}
              onValueChange={(value) => updateDraft({ categoryId: value })}
            >
              <SelectTrigger
                id="quick-category"
                className={cn(
                  "mt-0.5 h-8 w-full min-w-0 gap-1.5 border-0 bg-transparent px-0 py-0 shadow-none",
                  "text-[15px] font-medium text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
                )}
                aria-invalid={Boolean(state.errors?.categoryId)}
              >
                {selectedCategory ? (
                  <span className="flex min-w-0 items-center gap-1.5">
                    <CraftedIcon
                      name={getCategoryCraftedIcon(selectedCategory)}
                      size={15}
                      className={cn(
                        "shrink-0",
                        getCategoryIdentity(selectedCategory).inkClassName,
                      )}
                    />
                    <span className="truncate">{selectedCategory.name}</span>
                  </span>
                ) : (
                  <SelectValue placeholder={t.quickAdd.categoryPlaceholder} />
                )}
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
              className="text-xs"
            />
          </div>
        </div>

        {/* Nello spazio privato la data non merita un passo per sé: sta qui,
            terza riga della stessa lastra. */}
        {isTwoStep ? null : renderDateRow()}
      </div>
    );
  }

  function renderStepTwoFields() {
    return (
      <div className={PANEL_SLAB_CLASS}>
        {renderDateRow()}

        {canUseJointPayment ? (
          <div className="px-3.5 py-2.5">
            <div
              role="group"
              aria-label={t.quickAdd.paymentGroupLabel}
              className={cn(segmentGroupClassName(2), "ml-0 flex-none")}
            >
              <button
                type="button"
                className={segmentClassName(
                  effectivePaymentMode === "single_payer",
                )}
                aria-pressed={effectivePaymentMode === "single_payer"}
                onClick={() => handlePaymentModeChange("single_payer")}
              >
                <Receipt className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{t.entryForm.spentIntent}</span>
              </button>
              <button
                type="button"
                className={segmentClassName(
                  effectivePaymentMode === "joint_account",
                )}
                aria-pressed={effectivePaymentMode === "joint_account"}
                onClick={() => handlePaymentModeChange("joint_account")}
              >
                <Users2 className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{t.entryForm.jointIntent}</span>
              </button>
            </div>
          </div>
        ) : null}

        {effectivePaymentMode === "joint_account" ? (
          <p className="px-3.5 py-3 text-[13px] leading-5 text-muted-foreground">
            {t.entryForm.jointPaymentInfo}
          </p>
        ) : membersLoading ? (
          <p
            className="px-3.5 py-3 text-[13px] leading-5 text-muted-foreground"
            aria-live="polite"
          >
            {t.quickAdd.loadingMembers}
          </p>
        ) : (
          <EntryPeopleFields
            key={`${draft.paidByUserId}:${draft.beneficiaryUserIds.join(",")}`}
            members={activeMembers}
            variant="quick"
            paidByUserId={draft.paidByUserId}
            beneficiaryUserIds={draft.beneficiaryUserIds}
            errors={state.errors}
            onPaidByUserIdChange={handlePaidByUserIdChange}
            onBeneficiaryUserIdsChange={handleBeneficiaryUserIdsChange}
          />
        )}
      </div>
    );
  }

  function renderStepPanel(index: number, content: React.ReactNode) {
    const isActive = step === index;

    return (
      <div
        ref={(node) => {
          stepNodesRef.current[index] = node;
        }}
        aria-hidden={!isActive}
        inert={!isActive}
        className={cn(
          "absolute inset-x-0 top-0 px-4 pb-1",
          "transition-[transform,opacity] ease-[cubic-bezier(.2,.8,.2,1)]",
          "motion-reduce:transition-none",
          isActive
            ? "translate-x-0 opacity-100"
            : index < step
              ? "-translate-x-full opacity-0"
              : "translate-x-full opacity-0",
        )}
        style={{ transitionDuration: `${STEP_MOTION_MS}ms` }}
      >
        {content}
      </div>
    );
  }

  const saveButtons = (
    <div className="grid gap-2">
      <button
        type="submit"
        disabled={!canSubmit}
        onClick={() => setSavingIntent("save")}
        className={cn(
          PANEL_CTA_CLASS,
          canSubmit
            ? "bg-accent text-accent-foreground active:scale-[0.98] active:opacity-90"
            : "bg-surface-muted text-muted-foreground",
        )}
      >
        {pending && savingIntent === "save" ? (
          <>
            <Loader2
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            {t.quickAdd.savingButton}
          </>
        ) : (
          <>
            <Check className="size-4" aria-hidden="true" />
            {t.quickAdd.saveButton}
          </>
        )}
      </button>

      <button
        type="submit"
        disabled={!canSubmit}
        onClick={() => setSavingIntent("saveAndNew")}
        className={cn(
          "flex h-11 w-full items-center justify-center gap-2 rounded-[var(--r-cta)] border border-line",
          "text-[14px] font-medium text-foreground transition-colors duration-150 motion-reduce:transition-none",
          canSubmit
            ? "hover:bg-surface-muted active:opacity-90"
            : "text-muted-foreground opacity-60",
        )}
      >
        {pending && savingIntent === "saveAndNew" ? (
          <Loader2
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          <Plus className="size-4" aria-hidden="true" />
        )}
        {t.quickAdd.saveAndNewButton}
      </button>
    </div>
  );

  return (
    <>
      {overlay}
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);

          if (!nextOpen) {
            setStep(1);
            setSavingIntent("save");
            setPaymentMode("single_payer");
            setViewportHeight(undefined);
            hasDraftBeenEditedRef.current = false;
            setDraft(getInitialDraft(activeMembers, currentUserId));
          }
        }}
      >
        <DialogTrigger asChild>
          <button
            type="button"
            className={
              triggerVariant === "crafted"
                ? "flex size-10 items-center justify-center rounded-full border-[1.5px] border-accent bg-transparent text-accent transition-opacity active:opacity-70"
                : "flex size-[52px] items-center justify-center rounded-full bg-accent text-accent-foreground transition-[transform,opacity] duration-200 ease-[cubic-bezier(.2,.8,.2,1)] active:scale-[0.95] active:opacity-90"
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
            <span className="sr-only">{t.quickAdd.dialogTitle}</span>
          </button>
        </DialogTrigger>

        <DialogContent
          showCloseButton={false}
          /* Senza DialogDescription, Radix cercherebbe un aria-describedby che
             non esiste più: dichiararlo assente evita di puntare al vuoto. */
          aria-describedby={undefined}
          style={{ "--nlc-kb": `${keyboardInset}px` } as React.CSSProperties}
          className={PANEL_SHEET_CLASS}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
          }}
        >
          <div
            className={cn(
              PANEL_BODY_CLASS,
              "transition-[opacity,transform,filter] duration-200 ease-out motion-reduce:transition-none",
              successStage === "closing" && "translate-y-1 opacity-0 blur-[1px]",
            )}
          >
            <div className="px-4 pt-3.5">
              <div className="flex min-w-0 items-center gap-2">
                {isTwoStep && step === 2 ? (
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className="-ml-1.5 flex size-9 shrink-0 items-center justify-center rounded-full text-foreground outline-none transition-colors hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    <span className="sr-only">{t.quickAdd.previousStep}</span>
                  </button>
                ) : null}

                <DialogTitle className="min-w-0 flex-1 truncate text-[17px] font-semibold tracking-tight">
                  {t.quickAdd.dialogTitle}
                </DialogTitle>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="-mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <X className="size-4" aria-hidden="true" />
                  <span className="sr-only">{t.quickAdd.close}</span>
                </button>
              </div>

              <div className="mt-1 flex min-w-0 items-center justify-between gap-3 pb-2.5">
                <h2
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className="nlc-eyebrow min-w-0 truncate font-num text-[10.5px] font-normal uppercase tracking-[0.14em] text-ink-3 outline-none"
                >
                  <span className="sr-only">
                    {`${t.quickAdd.stepOf(step, totalSteps)} · `}
                  </span>
                  {isTwoStep
                    ? step === 1
                      ? t.quickAdd.stepOneTitle
                      : t.quickAdd.stepTwoTitle
                    : t.quickAdd.singleStepTitle}
                </h2>

                <span className="flex min-w-0 shrink items-center gap-1.5 text-[12px] text-muted-foreground">
                  {workspace.isShared ? (
                    <Users2 className="size-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <LockKeyhole className="size-3.5 shrink-0" aria-hidden="true" />
                  )}
                  <span className="truncate">{workspace.name}</span>
                  <span className="sr-only">
                    {workspace.isShared
                      ? t.quickAdd.workspaceShared
                      : t.quickAdd.workspacePrivate}
                  </span>
                </span>
              </div>
            </div>

            {/* Il confine dell'intestazione è il progresso: due segmenti quando i
                passi sono due, una riga sola quando il passo è uno. Lo stato si
                dice con l'inchiostro, non con il lime — quello è l'azione. */}
            <div className="px-4" aria-hidden="true">
              {isTwoStep ? (
                <div className="grid grid-cols-2 gap-1">
                  {[1, 2].map((index) => (
                    <span
                      key={index}
                      className={cn(
                        "h-[2px] rounded-full transition-colors duration-200 motion-reduce:transition-none",
                        index <= step ? "bg-foreground/70" : "bg-line",
                      )}
                    />
                  ))}
                </div>
              ) : (
                /* Dove non ci sono passi non c'è progresso da mostrare: resta
                   il filetto che chiude l'intestazione, e basta. */
                <span className="block h-px bg-line" />
              )}
            </div>

            <form action={formAction} className="flex min-w-0 flex-col pt-3.5">
              <input type="hidden" name="mode" value={QUICK_ADD_MODE} />
              <input
                type="hidden"
                name="savingContext"
                value={QUICK_ADD_SAVING_CONTEXT}
              />
              <input
                type="hidden"
                name="paymentMode"
                value={effectivePaymentMode}
              />
              {hiddenAmountSpent ? (
                <input
                  type="hidden"
                  name="amountSpent"
                  value={hiddenAmountSpent}
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

              {state.message && !state.success ? (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="mx-4 mb-3 rounded-[var(--r-control)] border border-destructive/25 px-3.5 py-2.5 text-[13px] leading-5 text-destructive"
                >
                  {state.message}
                </div>
              ) : null}

              <div
                className={cn(
                  "relative overflow-hidden",
                  "transition-[height] ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none",
                )}
                style={{
                  height: viewportHeight,
                  transitionDuration: `${STEP_MOTION_MS}ms`,
                }}
              >
                {renderStepPanel(
                  1,
                  <>
                    {renderStepOneFields()}

                    {suggestion ? (
                      <ExpenseSuggestionCard
                        className="mt-3 px-1"
                        suggestion={suggestion}
                        href={suggestionHref}
                        onNavigate={() => setOpen(false)}
                      />
                    ) : showSuggestionLookupState ? (
                      <p
                        className="mt-3 flex items-center gap-2 px-1 text-[12.5px] leading-4 text-ink-3"
                        aria-live="polite"
                      >
                        <Loader2
                          className="size-3.5 animate-spin motion-reduce:animate-none"
                          aria-hidden="true"
                        />
                        {t.quickAdd.searchingSuggestion}
                      </p>
                    ) : null}
                  </>,
                )}

                {isTwoStep ? renderStepPanel(2, renderStepTwoFields()) : null}
              </div>

              <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3.5">
                {isTwoStep && step === 1 ? (
                  <button
                    type="button"
                    disabled={!isStepOneReady}
                    onClick={() => goToStep(2)}
                    className={cn(
                      PANEL_CTA_CLASS,
                      isStepOneReady
                        ? "bg-accent text-accent-foreground active:scale-[0.98] active:opacity-90"
                        : "bg-surface-muted text-muted-foreground",
                    )}
                  >
                    {t.quickAdd.nextStep}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </button>
                ) : (
                  saveButtons
                )}

                <p className="mt-3 text-center text-[12px] leading-4 text-ink-3">
                  {t.quickAdd.fullFormHint}{" "}
                  <Link
                    href={fullFormHref}
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-0.5 rounded-sm text-foreground underline decoration-line underline-offset-2 outline-none transition-colors hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {t.quickAdd.fullFormLink}
                    <ArrowUpRight className="size-3" aria-hidden="true" />
                  </Link>
                </p>
              </div>
            </form>

            <p className="sr-only" role="status" aria-live="polite">
              {liveMessage}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
