"use client";

import { useState, useTransition } from "react";

import { uploadImportBatchAction } from "@/src/actions/imports";
import { Button } from "@/components/ui/button";
import { Label, Serif } from "@/components/crafted";

type CraftedImportUploadFormProps = {
  maxFileSizeMb?: number;
};

export function CraftedImportUploadForm({
  maxFileSizeMb = 1,
}: CraftedImportUploadFormProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await uploadImportBatchAction(formData);
        setNotice(result.message);

        if (result.success && result.batchId) {
          if (typeof window !== "undefined") {
            window.location.assign(`/workspace/imports/${result.batchId}`);
          }
        }
      } catch {
        setNotice("Non riesco a caricare il CSV adesso.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 border-y border-line py-5"
    >
      <div>
        <Label className="mb-2 block">Carica CSV banca</Label>
        <h2 className="text-lg font-semibold tracking-tight">
          Scegli il file da importare
        </h2>
        <Serif className="mt-2 block text-sm text-muted-foreground">
          Carica un estratto conto CSV, controlla le righe e conferma solo quelle corrette.
        </Serif>
      </div>

      <div className="space-y-2">
        <label htmlFor="import-file" className="text-sm font-medium leading-none">
          File CSV
        </label>
        <input
          id="import-file"
          name="file"
          type="file"
          accept=".csv,text/csv,text/plain"
          className="block w-full rounded-[var(--r-control)] border border-line bg-background px-3 py-2 text-sm file:mr-4 file:rounded-[var(--r-control)] file:border-0 file:bg-surface-muted file:px-3 file:py-2 file:text-xs file:font-medium"
        />
        <p className="text-xs text-muted-foreground">
          Formato supportato: CSV o testo. Dimensione massima: {maxFileSizeMb} MB.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          disabled={isPending}
          className="h-10 rounded-[var(--r-cta)] px-4"
        >
          {isPending ? "Caricamento…" : "Carica CSV"}
        </Button>
        {notice ? (
          <Serif className="text-sm text-muted-foreground">{notice}</Serif>
        ) : null}
      </div>
    </form>
  );
}
