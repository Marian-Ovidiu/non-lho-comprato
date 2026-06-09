"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { CraftedIcon, Label, Mono, Rule, Serif } from "@/components/crafted";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteEntry, updateEntry } from "@/src/actions/entries";
import { EntryPeopleFields } from "@/src/components/entries/entry-people-fields";
import { getCategoryCraftedIcon } from "@/src/lib/category-crafted-icon";
import { formatCraftedCompact, splitCraftedAmount } from "@/src/lib/crafted-money";
import { cn } from "@/lib/utils";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
};

type EntryToEdit = {
  id: string;
  title: string;
  categoryId: string;
  realCost: number;
  alternativeCost: number;
  date: string;
  note: string | null;
  source: string;
  paidByUserId: string;
  beneficiaryUserIds: string[];
};

type FormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
};

const ROME_TIME_ZONE = "Europe/Rome";
const initialState: FormState = { success: false, message: "", errors: {} };

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-2 text-sm text-destructive">{message}</p>;
}

function getDateValue(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ROME_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parsed);

  return `${parts.find((p) => p.type === "year")?.value}-${parts.find((p) => p.type === "month")?.value}-${parts.find((p) => p.type === "day")?.value}`;
}

export function CraftedEntryEditForm({
  entry,
  categories,
  members,
}: {
  entry: EntryToEdit;
  categories: CategoryOption[];
  members: WorkspaceMemberOption[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const didHandleSuccessRef = useRef(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [categoryId, setCategoryId] = useState(entry.categoryId);
  const [showSavingsField, setShowSavingsField] = useState(
    entry.alternativeCost !== entry.realCost,
  );
  const [realCost, setRealCost] = useState(entry.realCost.toFixed(2));
  const [alternativeCost, setAlternativeCost] = useState(entry.alternativeCost.toFixed(2));
  const resolvedAlternativeCost = showSavingsField ? alternativeCost : realCost;
  const redirect = useCallback((path: string) => router.replace(path), [router]);
  const [state, formAction, pending] = useActionState(
    async (_previousState: FormState, formData: FormData) => updateEntry(entry.id, formData),
    initialState,
  );

  const savedAmount = Math.max(Number(alternativeCost) - Number(realCost), 0);
  const heroAmount = splitCraftedAmount(savedAmount || Number(realCost));

  useEffect(() => {
    if (!state.success || didHandleSuccessRef.current) return;
    didHandleSuccessRef.current = true;
    const timeout = window.setTimeout(() => redirect("/entries"), 800);
    return () => window.clearTimeout(timeout);
  }, [redirect, state.success]);

  const helperText = useMemo(() => {
    if (entry.source === "habit") {
      return "Puoi correggere il movimento senza scollegarlo dall'abitudine.";
    }
    return "Aggiorna i campi e il risparmio viene ricalcolato dal server.";
  }, [entry.source]);

  function handleDelete() {
    setDeleteMessage(null);

    startDeleteTransition(async () => {
      const result = await deleteEntry(entry.id);

      if (!result.success) {
        setDeleteMessage(result.message);
        return;
      }

      setDeleteOpen(false);
      router.replace("/entries");
      router.refresh();
    });
  }

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      <form ref={formRef} action={formAction}>
        <input type="hidden" name="alternativeCost" value={resolvedAlternativeCost} />
        <input type="hidden" name="categoryId" value={categoryId} />

        <div className="flex items-center justify-between px-5 pb-1.5 pt-3">
          <Link href="/entries" className="text-sm text-muted-foreground hover:opacity-80">
            Annulla
          </Link>
          <Label>Modifica segnale</Label>
          <div className="w-14" aria-hidden="true" />
        </div>

        <section className="px-5 py-5 text-center">
          <Serif className="mb-3 text-sm text-muted-foreground">tenuti nel movimento</Serif>
          <div className="flex items-start justify-center gap-1.5">
            <Mono className="text-[clamp(2.5rem,12vw,3.5rem)] font-semibold leading-[0.9] tracking-[-0.05em] text-accent">
              {heroAmount.whole}
            </Mono>
            <Mono className="mt-1.5 text-xl text-muted-foreground">,{heroAmount.decimals}€</Mono>
          </div>
          <Serif className="mt-3 block text-sm text-ink-3">{helperText}</Serif>
        </section>
        <Rule />

        {state.message ? (
          <div
            className={cn(
              "mx-5 my-4 border px-4 py-3 text-sm",
              state.success ? "border-green/30 text-green" : "border-destructive/30 text-destructive",
            )}
          >
            {state.message}
          </div>
        ) : null}

        <div className="px-5 pb-2 pt-4">
          <Label className="mb-3 block">Categoria</Label>
          <div className="flex gap-5 overflow-x-auto pb-1">
            {categories.map((cat) => {
              const selected = categoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={cn(
                    "flex shrink-0 flex-col items-center gap-2 border-b-[1.5px] pb-2",
                    selected ? "border-accent" : "border-transparent",
                  )}
                >
                  <CraftedIcon
                    name={getCategoryCraftedIcon(cat)}
                    size={22}
                    className={selected ? "text-accent" : "text-muted-foreground"}
                  />
                  <span
                    className={cn(
                      "whitespace-nowrap text-[11.5px]",
                      selected ? "font-semibold text-foreground" : "font-[450] text-ink-3",
                    )}
                  >
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
          <FieldError message={state.errors?.categoryId} />
        </div>

        <div className="px-5 pb-3">
          <div className="flex items-center justify-between gap-4 border-y border-line py-3">
            <input
              id="title"
              name="title"
              defaultValue={entry.title}
              placeholder="Caffè in stazione"
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3/70"
              aria-invalid={Boolean(state.errors?.title)}
            />
            <Label>Cosa</Label>
          </div>
          <FieldError message={state.errors?.title} />
        </div>

        <div className="space-y-3 px-5 pb-3">
          <div className="border-y border-line py-3">
            <label className="flex items-center justify-between gap-4">
              <input
                id="realCost"
                name="realCost"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={realCost}
                onChange={(event) => setRealCost(event.target.value)}
                className="min-w-0 flex-1 bg-transparent font-num text-sm outline-none"
              />
              <Label>Speso</Label>
            </label>
            <FieldError message={state.errors?.realCost} />
          </div>

          <button
            type="button"
            onClick={() => {
              setShowSavingsField((current) => {
                if (current) return false;
                setAlternativeCost((prev) => prev || realCost);
                return true;
              });
            }}
            className="text-[13px] text-ink-3 hover:text-foreground"
          >
            {showSavingsField ? "Nascondi risparmio" : "Ho risparmiato qualcosa?"}
          </button>

          {showSavingsField ? (
            <div className="border-y border-line py-3">
              <label className="flex items-center justify-between gap-4">
                <input
                  id="alternativeCost"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={alternativeCost}
                  onChange={(event) => setAlternativeCost(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent font-num text-sm outline-none"
                />
                <Label>Avresti speso</Label>
              </label>
              <FieldError message={state.errors?.alternativeCost} />
            </div>
          ) : null}
        </div>

        <div className="space-y-3 px-5 pb-3">
          <div className="border-y border-line py-3">
            <label className="flex items-center justify-between gap-4">
              <input
                id="date"
                name="date"
                type="date"
                defaultValue={getDateValue(entry.date)}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              <Label>Data</Label>
            </label>
            <FieldError message={state.errors?.date} />
          </div>

          <div className="border-y border-line py-3">
            <label className="flex items-start justify-between gap-4">
              <textarea
                id="note"
                name="note"
                defaultValue={entry.note ?? ""}
                rows={2}
                className="min-w-0 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-ink-3/70"
                placeholder="Nota opzionale"
              />
              <Label>Nota</Label>
            </label>
          </div>

          <EntryPeopleFields
            members={members}
            paidByUserId={entry.paidByUserId}
            beneficiaryUserIds={entry.beneficiaryUserIds}
            errors={state.errors}
          />
        </div>

        <div className="space-y-3 px-5 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] pt-2">
          <button
            type="submit"
            disabled={pending || isDeleting || categories.length === 0 || members.length === 0}
            className={cn(
              "flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl text-[15.5px] font-bold",
              "bg-accent text-accent-foreground transition-opacity disabled:opacity-50",
            )}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Salvataggio…
              </>
            ) : (
              <>Salva · {formatCraftedCompact(Number(realCost))}€</>
            )}
          </button>
          <button
            type="button"
            disabled={pending || isDeleting}
            onClick={() => {
              setDeleteMessage(null);
              setDeleteOpen(true);
            }}
            className="flex h-11 w-full items-center justify-center text-[13px] text-destructive/80 transition-colors hover:text-destructive disabled:opacity-50"
          >
            Elimina movimento
          </button>
        </div>
      </form>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-line sm:max-w-md">
          <DialogTitle>Elimina movimento</DialogTitle>
          <DialogDescription>
            {entry.source === "habit"
              ? "Il movimento verrà rimosso e l'occorrenza dell'abitudine tornerà segnata come evitata."
              : "Il movimento verrà rimosso dal registro. L'operazione non si può annullare."}
          </DialogDescription>

          {deleteMessage ? (
            <p className="text-sm text-destructive">{deleteMessage}</p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setDeleteOpen(false)}
              className="px-4 py-2.5 text-sm text-ink-3 transition-colors hover:text-foreground disabled:opacity-50"
            >
              Annulla
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="flex items-center justify-center gap-2 rounded-2xl border border-destructive/40 px-5 py-2.5 text-sm font-semibold text-destructive transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  Eliminazione…
                </>
              ) : (
                "Elimina"
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
