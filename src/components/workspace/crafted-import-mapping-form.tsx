"use client";

import { useState, useTransition } from "react";

import { saveImportMappingAction } from "@/src/actions/imports";
import { Button } from "@/components/ui/button";
import { Label, Serif } from "@/components/crafted";
import type { CsvImportColumnMapping } from "@/src/lib/imports/import-domain";

type CraftedImportMappingFormProps = {
  batchId: string;
  headers: string[];
  initialMapping?: CsvImportColumnMapping | null;
};

function getDefaultHeader(
  headers: string[],
  initialMapping: CsvImportColumnMapping | null | undefined,
  field: keyof Pick<CsvImportColumnMapping, "date" | "description" | "amount" | "currency" | "merchantName">,
): string {
  const mapped = initialMapping?.[field];
  if (mapped) {
    return mapped;
  }

  if (field === "date") {
    return headers.find((header) => /data|date|giorno/i.test(header)) ?? "";
  }

  if (field === "description") {
    return headers.find((header) => /descr|description|causale|note/i.test(header)) ?? "";
  }

  if (field === "amount") {
    return headers.find((header) => /import|amount|value|totale/i.test(header)) ?? "";
  }

  if (field === "currency") {
    return headers.find((header) => /valuta|currency/i.test(header)) ?? "";
  }

  if (field === "merchantName") {
    return headers.find((header) => /merchant|controparte|nome/i.test(header)) ?? "";
  }

  return "";
}

export function CraftedImportMappingForm({
  batchId,
  headers,
  initialMapping = null,
}: CraftedImportMappingFormProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasHeaders = headers.length > 0;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await saveImportMappingAction(formData);
        setNotice(result.message);

        if (result.success) {
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        }
      } catch {
        setNotice("Non riesco a salvare il mapping adesso.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 border-y border-line py-5"
    >
      <div>
        <Label className="mb-2 block">Mappa le colonne</Label>
        <h2 className="text-lg font-semibold tracking-tight">
          Collega i campi del CSV
        </h2>
        <Serif className="mt-2 block text-sm text-muted-foreground">
          Scegli manualmente le colonne corrette. Il file non viene importato finché non confermi le righe.
        </Serif>
      </div>

      <input type="hidden" name="batchId" value={batchId} />

      <div className="flex flex-wrap gap-2">
        {headers.map((header) => (
          <span
            key={header}
            className="inline-flex rounded-full border border-line px-3 py-1 text-xs text-ink-3"
          >
            {header}
          </span>
        ))}
      </div>

      {!hasHeaders ? (
        <p className="text-sm text-muted-foreground">
          Nessuna intestazione trovata nel CSV.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["date", "Colonna data"],
          ["description", "Colonna descrizione"],
          ["amount", "Colonna importo"],
          ["currency", "Valuta opzionale"],
          ["merchantName", "Merchant opzionale"],
        ].map(([field, label]) => (
          <div key={field} className="space-y-2">
            <label className="text-sm font-medium leading-none">{label}</label>
            <select
              name={field}
              defaultValue={getDefaultHeader(
                headers,
                initialMapping,
                field as "date" | "description" | "amount" | "currency" | "merchantName",
              )}
              className="h-11 w-full rounded-[var(--r-control)] border border-line bg-background px-3 text-sm"
            >
              <option value="">— Seleziona —</option>
              {headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </div>
        ))}

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Formato data</label>
          <select
            name="dateFormat"
            defaultValue={initialMapping?.dateFormat ?? "DD/MM/YYYY"}
            className="h-11 w-full rounded-[var(--r-control)] border border-line bg-background px-3 text-sm"
          >
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">
            Convenzione segno importo
          </label>
          <select
            name="amountConvention"
            defaultValue={initialMapping?.amountConvention ?? "negative_is_expense"}
            className="h-11 w-full rounded-[var(--r-control)] border border-line bg-background px-3 text-sm"
          >
            <option value="negative_is_expense">Negativo = uscita</option>
            <option value="positive_is_expense">Positivo = uscita</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          disabled={isPending || !hasHeaders}
          className="h-10 rounded-[var(--r-cta)] px-4"
        >
          {isPending ? "Salvataggio…" : "Salva mapping"}
        </Button>
        {notice ? (
          <Serif className="text-sm text-muted-foreground">{notice}</Serif>
        ) : null}
      </div>
    </form>
  );
}
