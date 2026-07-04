import { confirmImportedTransactionsAction, ignoreImportedTransactionsAction } from "@/src/actions/imports";
import { Button } from "@/components/ui/button";
import { Label, Mono, Serif } from "@/components/crafted";
import { cn } from "@/lib/utils";
import { CraftedImportRowActions } from "@/src/components/workspace/crafted-import-row-actions";
import { useBoundLocale } from "@/src/components/language/use-locale-formatters";

type ImportCategoryOption = {
  id: string;
  name: string;
};

type ImportedTransactionPreview = {
  id: string;
  sourceRowIndex: number;
  date: Date | null;
  description: string;
  merchantName: string | null;
  amount: string | number | null;
  currency: string | null;
  status: "pending" | "confirmed" | "ignored" | "duplicate" | "error";
  categoryIdSuggested: string | null;
  categoryIdConfirmed: string | null;
  errorMessage: string | null;
};

type CraftedImportPreviewTableProps = {
  batchId: string;
  transactions: ImportedTransactionPreview[];
  categories: ImportCategoryOption[];
  currency: string;
};

function formatMoneyBase(
  locale: string,
  amount: string | number | null,
  currency: string,
): string {
  const value = typeof amount === "string" ? Number(amount) : amount ?? 0;
  const normalized = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(normalized);
}

function formatDateBase(locale: string, date: Date | null): string {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function resolveSuggestedCategoryName(
  categoryIdSuggested: string | null,
  categories: ImportCategoryOption[],
): string | null {
  if (!categoryIdSuggested) {
    return null;
  }

  return categories.find((category) => category.id === categoryIdSuggested)?.name ?? null;
}

export function CraftedImportPreviewTable({
  batchId,
  transactions,
  categories,
  currency,
}: CraftedImportPreviewTableProps) {
  const formatMoney = useBoundLocale(formatMoneyBase);
  const formatDate = useBoundLocale(formatDateBase);
  const pendingRows = transactions.filter((transaction) => transaction.status === "pending");
  const hasSelectableRows = pendingRows.length > 0;
  const defaultCategoryId = categories[0]?.id ?? "";
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));

  async function handleConfirmAction(formData: FormData): Promise<void> {
    await confirmImportedTransactionsAction(formData);
  }

  async function handleIgnoreAction(formData: FormData): Promise<void> {
    await ignoreImportedTransactionsAction(formData);
  }

  if (transactions.length === 0) {
    return (
      <section className="border-y border-line py-5">
        <Label className="mb-2 block">Preview</Label>
        <p className="text-sm text-muted-foreground">
          Nessuna riga da mostrare.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 border-y border-line py-5">
      <div className="space-y-1">
        <Label className="block">Preview righe importate</Label>
        <Serif className="block text-sm text-muted-foreground">
          Seleziona solo le righe corrette. Le righe duplicate, ignorate, errore o già confermate restano visibili ma non si possono confermare di nuovo.
        </Serif>
      </div>

      <form className="space-y-4">
        <input type="hidden" name="batchId" value={batchId} />

        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-2">
            <label htmlFor="import-category" className="text-sm font-medium leading-none">
              Categoria per le righe selezionate
            </label>
            <select
              id="import-category"
              name="categoryId"
              defaultValue={defaultCategoryId}
              className="h-11 w-full rounded-[var(--r-control)] border border-line bg-background px-3 text-sm"
              disabled={!hasSelectableRows || categories.length === 0}
            >
              <option value="">— Seleziona categoria —</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              formAction={handleConfirmAction}
              disabled={!hasSelectableRows || categories.length === 0}
              className="h-10 rounded-[var(--r-cta)] px-4"
            >
              Conferma selezionate
            </Button>
            <Button
              type="submit"
              formAction={handleIgnoreAction}
              disabled={!hasSelectableRows}
              variant="outline"
              className="h-10 rounded-[var(--r-cta)] border-line px-4"
            >
              Ignora selezionate
            </Button>
          </div>
        </div>

        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Non ci sono categorie disponibili: crea almeno una categoria prima di confermare le righe.
          </p>
        ) : null}

        <div className="overflow-x-auto rounded-[var(--r-card)] border border-line">
          <table className="min-w-full divide-y divide-line-soft text-left text-sm">
            <thead className="bg-surface-muted/40 text-[11px] uppercase tracking-[0.14em] text-ink-3">
              <tr>
                <th className="px-3 py-3">Stato</th>
                <th className="px-3 py-3">Data</th>
                <th className="px-3 py-3">Descrizione</th>
                <th className="px-3 py-3">Importo</th>
                <th className="px-3 py-3">Categoria</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft bg-background">
              {transactions.map((transaction) => {
                const suggestedCategoryName = resolveSuggestedCategoryName(
                  transaction.categoryIdSuggested,
                  categories,
                );

                return (
                <tr key={transaction.id} className={cn(transaction.status === "confirmed" ? "bg-surface-muted/25" : undefined)}>
                  <td className="px-3 py-3 align-top">
                    <CraftedImportRowActions
                      id={transaction.id}
                      status={transaction.status}
                      selectable={transaction.status === "pending"}
                      compact
                    />
                  </td>
                  <td className="px-3 py-3 align-top text-ink-3">{formatDate(transaction.date)}</td>
                  <td className="px-3 py-3 align-top">
                    <div className="min-w-0">
                      <p className="font-medium tracking-[-0.01em]">{transaction.merchantName ?? transaction.description}</p>
                      {transaction.merchantName && transaction.merchantName !== transaction.description ? (
                        <p className="mt-1 text-xs text-ink-3">{transaction.description}</p>
                      ) : null}
                      {transaction.categoryIdSuggested ? (
                        <p className="mt-1 text-xs text-ink-3">
                          {suggestedCategoryName ? (
                            <span className="inline-flex items-center rounded-full border border-line bg-surface-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-foreground">
                              Suggerita: {suggestedCategoryName}
                            </span>
                          ) : null}
                        </p>
                      ) : null}
                      {transaction.errorMessage ? (
                        <p className="mt-1 text-xs text-destructive">{transaction.errorMessage}</p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top font-medium">
                    <Mono className="text-sm">{formatMoney(transaction.amount, transaction.currency ?? currency)}</Mono>
                  </td>
                  <td className="px-3 py-3 align-top text-ink-3">
                    {transaction.categoryIdConfirmed
                      ? `Confermata: ${categoryNameById.get(transaction.categoryIdConfirmed) ?? "—"}`
                      : transaction.status === "pending"
                        ? "Da confermare"
                        : "—"}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </form>
    </section>
  );
}
