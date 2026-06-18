import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { LanguageProvider } from "@/src/components/language/language-context";
import { CraftedMore } from "@/src/components/more/crafted-more";
import { CraftedImportBatchList } from "@/src/components/workspace/crafted-import-batch-list";
import { CraftedImportMappingForm } from "@/src/components/workspace/crafted-import-mapping-form";
import { CraftedImportPreviewTable } from "@/src/components/workspace/crafted-import-preview-table";
import { CraftedImportRowActions } from "@/src/components/workspace/crafted-import-row-actions";
import { CraftedImportUploadForm } from "@/src/components/workspace/crafted-import-upload-form";

function renderWithLanguage(node: React.ReactNode) {
  return renderToStaticMarkup(
    <LanguageProvider language="it">{node}</LanguageProvider>,
  );
}

const headers = ["Data", "Descrizione", "Importo", "Valuta"];

describe("Import CSV UI", () => {
  it("pagina import renderizza upload form", () => {
    const markup = renderToStaticMarkup(<CraftedImportUploadForm />);

    assert.match(markup, /Carica CSV banca/);
    assert.match(markup, /accept="\.csv,text\/csv,text\/plain"/);
    assert.match(markup, /Dimensione massima: 1 MB/);
    assert.match(markup, /Carica CSV/);
  });

  it("lista batch vuota renderizza empty state", () => {
    const markup = renderToStaticMarkup(<CraftedImportBatchList batches={[]} />);

    assert.match(markup, /Nessun import ancora/);
    assert.match(markup, /Carica il primo CSV qui sopra/);
  });

  it("batch list con elementi mostra il link al batch", () => {
    const markup = renderToStaticMarkup(
      <CraftedImportBatchList
        batches={[
          {
            id: "batch-1",
            originalFilename: "movimenti.csv",
            status: "ready",
            rowCount: 12,
            confirmedCount: 3,
            duplicateCount: 1,
            createdAt: new Date("2026-06-18T10:00:00.000Z"),
          },
        ]}
      />,
    );

    assert.match(markup, /href="\/workspace\/imports\/batch-1"/);
    assert.match(markup, /movimenti\.csv/);
    assert.match(markup, /Continua/);
  });

  it("batch detail senza mapping renderizza mapping form", () => {
    const markup = renderToStaticMarkup(
      <CraftedImportMappingForm
        batchId="batch-1"
        headers={headers}
        initialMapping={null}
      />,
    );

    assert.match(markup, /Mappa le colonne/);
    assert.match(markup, /Colonna data/);
    assert.match(markup, /Formato data/);
    assert.match(markup, /Salva mapping/);
  });

  it("batch detail con transactions renderizza preview", () => {
    const markup = renderToStaticMarkup(
      <CraftedImportPreviewTable
        batchId="batch-1"
        currency="EUR"
        categories={[
          { id: "category-1", name: "Spesa" },
          { id: "category-2", name: "Casa" },
        ]}
        transactions={[
          {
            id: "tx-1",
            sourceRowIndex: 1,
            date: new Date("2026-06-01T00:00:00.000Z"),
            description: "Bar",
            merchantName: "Bar Centrale",
            amount: "-12.34",
            currency: "EUR",
            status: "pending",
            categoryIdConfirmed: null,
            errorMessage: null,
          },
          {
            id: "tx-2",
            sourceRowIndex: 2,
            date: new Date("2026-06-01T00:00:00.000Z"),
            description: "Duplicata",
            merchantName: null,
            amount: "-12.34",
            currency: "EUR",
            status: "duplicate",
            categoryIdConfirmed: null,
            errorMessage: null,
          },
          {
            id: "tx-3",
            sourceRowIndex: 3,
            date: null,
            description: "Errore",
            merchantName: null,
            amount: null,
            currency: null,
            status: "error",
            categoryIdConfirmed: null,
            errorMessage: "Dati mancanti",
          },
        ]}
      />,
    );

    assert.match(markup, /Preview righe importate/);
    assert.match(markup, /Conferma selezionate/);
    assert.match(markup, /Ignora selezionate/);
    assert.match(markup, /Bar Centrale/);
    assert.match(markup, /Duplicata/);
    assert.match(markup, /Dati mancanti/);
    assert.equal((markup.match(/type="checkbox"/g) ?? []).length, 1);
  });

  it("righe duplicate/error non sono confermabili", () => {
    const markup = renderToStaticMarkup(
      <CraftedImportPreviewTable
        batchId="batch-1"
        currency="EUR"
        categories={[{ id: "category-1", name: "Spesa" }]}
        transactions={[
          {
            id: "tx-1",
            sourceRowIndex: 1,
            date: new Date("2026-06-01T00:00:00.000Z"),
            description: "Pending",
            merchantName: null,
            amount: "-12.34",
            currency: "EUR",
            status: "pending",
            categoryIdConfirmed: null,
            errorMessage: null,
          },
          {
            id: "tx-2",
            sourceRowIndex: 2,
            date: new Date("2026-06-01T00:00:00.000Z"),
            description: "Duplicate",
            merchantName: null,
            amount: "-12.34",
            currency: "EUR",
            status: "duplicate",
            categoryIdConfirmed: null,
            errorMessage: null,
          },
          {
            id: "tx-3",
            sourceRowIndex: 3,
            date: null,
            description: "Error",
            merchantName: null,
            amount: null,
            currency: null,
            status: "error",
            categoryIdConfirmed: null,
            errorMessage: "Dato mancante",
          },
        ]}
      />,
    );

    assert.equal((markup.match(/type="checkbox"/g) ?? []).length, 1);
    assert.match(markup, /Duplicate/);
    assert.match(markup, /Dato mancante/);
  });

  it("link menu Import CSV presente", () => {
    const markup = renderWithLanguage(
      <CraftedMore
        profileLabel="Account"
        workspaceName="Workspace"
        workspaceLabel="Privato"
        workspaceInitials="WS"
        isAuthenticated
        workspaceNextStep={null}
        showWorkspaceTools
        workspaceSection={<div />}
        appSection={<div />}
      />,
    );

    assert.match(markup, /Import CSV/);
    assert.match(markup, /\/workspace\/imports/);
  });

  it("lista vuota e componenti accettano input vuoti senza crash", () => {
    const markup = renderToStaticMarkup(
      <CraftedImportRowActions
        id="tx-1"
        status="confirmed"
        selectable={false}
      />,
    );

    assert.match(markup, /Confermata/);
  });
});
