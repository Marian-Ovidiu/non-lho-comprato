import { redirect } from "next/navigation";

import { Rule } from "@/components/crafted";
import { CraftedSubpageHeader } from "@/src/components/layout/crafted-subpage-header";
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";
import { getImportBatchAction } from "@/src/actions/imports";
import { getAuthenticatedUser } from "@/src/lib/auth/session";
import { prisma } from "@/src/lib/prisma";
import { getCurrentWorkspace } from "@/src/lib/workspace-context";
import { formatDataLoadError } from "@/src/lib/data-load-error";
import { CraftedImportMappingForm } from "@/src/components/workspace/crafted-import-mapping-form";
import { CraftedImportPreviewTable } from "@/src/components/workspace/crafted-import-preview-table";
import type { CsvImportColumnMapping } from "@/src/lib/imports/import-domain";

type ImportPagePrismaLike = {
  category: {
    findMany(args: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, unknown>[];
      select?: Record<string, unknown>;
    }): Promise<Array<{ id: string; name: string }>>;
  };
};

type ImportBatchPageProps = {
  params: Promise<{
    batchId: string;
  }>;
};

type ImportCategoryOption = {
  id: string;
  name: string;
};

function isImportColumnMapping(
  value: unknown,
): value is CsvImportColumnMapping {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "date" in value && "description" in value && "amount" in value;
}

export default async function WorkspaceImportBatchPage({
  params,
}: ImportBatchPageProps) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    redirect("/login");
  }

  const { batchId } = await params;

  let loadError: string | null = null;
  let workspace = null as Awaited<ReturnType<typeof getCurrentWorkspace>> | null;
  let batch = null as Awaited<ReturnType<typeof getImportBatchAction>>;
  let categories: ImportCategoryOption[] = [];
  const importPrisma = prisma as unknown as ImportPagePrismaLike;

  try {
    workspace = await getCurrentWorkspace();
    [batch, categories] = await Promise.all([
      getImportBatchAction(batchId),
      importPrisma.category.findMany({
        where: {
          workspaceId: workspace.id,
          archivedAt: null,
        },
        orderBy: [{ name: "asc" }],
        select: {
          id: true,
          name: true,
        },
      }),
    ]);
  } catch (error) {
    loadError = formatDataLoadError(error);
    console.error("Failed to load workspace import batch page:", error);
  }

  if (loadError || !workspace || !batch) {
    return (
      <main className="pb-6">
        <div className="px-5 pt-5 pb-4">
          <DataLoadErrorBanner
            title="Impossibile caricare il batch import"
            message={loadError ?? "Batch non disponibile o non autorizzato."}
          />
        </div>
      </main>
    );
  }

  const mapping = isImportColumnMapping(batch.batch.columnMappingJson)
    ? batch.batch.columnMappingJson
    : null;
  const headers = Array.isArray(batch.batch.headerRowJson)
    ? batch.batch.headerRowJson.filter((value): value is string => typeof value === "string")
    : [];
  const previewTransactions = batch.transactions.map((transaction) => ({
    ...transaction,
    amount:
      transaction.amount === null
        ? null
        : String(transaction.amount),
  }));

  if (batch.batch.status === "failed") {
    return (
      <main className="pb-6">
        <CraftedSubpageHeader
          backHref="/workspace/imports"
          eyebrow="Workspace"
          title="Import CSV"
          context="Questo batch ha un problema di parsing o mapping."
        />
        <Rule />
        <div className="px-5 py-6">
          <DataLoadErrorBanner
            title="Batch import fallito"
            message={batch.batch.errorMessage ?? "Non riesco a processare questo CSV."}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="pb-6">
      <CraftedSubpageHeader
        backHref="/workspace/imports"
        eyebrow="Workspace"
        title="Import CSV"
        context="Mappa il file, controlla la preview e conferma solo le righe corrette."
      />
      <Rule />
      <section className="-mx-4 px-5 py-6 sm:-mx-6 lg:-mx-8">
        {!mapping ? (
          <CraftedImportMappingForm
            batchId={batch.batch.id}
            headers={headers}
            initialMapping={null}
          />
        ) : (
          <CraftedImportPreviewTable
            batchId={batch.batch.id}
            transactions={previewTransactions}
            categories={categories}
            currency={workspace.currency}
          />
        )}
      </section>
    </main>
  );
}
