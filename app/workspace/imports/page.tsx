import { redirect, unstable_rethrow } from "next/navigation";

import { Rule } from "@/components/crafted";
import { CraftedSubpageHeader } from "@/src/components/layout/crafted-subpage-header";
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";
import { getAuthenticatedUser } from "@/src/lib/auth/session";
import { prisma } from "@/src/lib/prisma";
import { getCurrentWorkspace } from "@/src/lib/workspace-context";
import { formatDataLoadError } from "@/src/lib/data-load-error";
import { CraftedImportBatchList } from "@/src/components/workspace/crafted-import-batch-list";
import { CraftedImportUploadForm } from "@/src/components/workspace/crafted-import-upload-form";

type ImportListPrismaLike = {
  importBatch: {
    findMany(args: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, unknown>[];
      take?: number;
      select?: Record<string, unknown>;
    }): Promise<
      Array<{
        id: string;
        originalFilename: string | null;
        status: "parsing" | "ready" | "partial" | "completed" | "failed";
        rowCount: number;
        confirmedCount: number;
        duplicateCount: number;
        createdAt: Date;
      }>
    >;
  };
};

type ImportBatchListItem = {
  id: string;
  originalFilename: string | null;
  status: "parsing" | "ready" | "partial" | "completed" | "failed";
  rowCount: number;
  confirmedCount: number;
  duplicateCount: number;
  createdAt: Date;
};

export default async function WorkspaceImportsPage() {
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    redirect("/login");
  }

  let loadError: string | null = null;
  let workspace = null as Awaited<ReturnType<typeof getCurrentWorkspace>> | null;
  let batches: ImportBatchListItem[] = [];
  const importPrisma = prisma as unknown as ImportListPrismaLike;

  try {
    workspace = await getCurrentWorkspace();
    batches = await importPrisma.importBatch.findMany({
      where: {
        workspaceId: workspace.id,
      },
      orderBy: [{ createdAt: "desc" }],
      take: 8,
      select: {
        id: true,
        originalFilename: true,
        status: true,
        rowCount: true,
        confirmedCount: true,
        duplicateCount: true,
        createdAt: true,
      },
    });
  } catch (error) {
    unstable_rethrow(error);
    loadError = formatDataLoadError(error);
    console.error("Failed to load workspace imports page:", error);
  }

  if (loadError || !workspace) {
    return (
      <main className="pb-6">
        <div className="px-5 pt-5 pb-4">
          <DataLoadErrorBanner
            title="Impossibile caricare gli import"
            message={loadError ?? "Workspace non disponibile. Riprova tra poco."}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="pb-6">
      <CraftedSubpageHeader
        backHref="/more"
        eyebrow="Workspace"
        title="Importa movimenti da CSV"
        context="Carica un estratto conto CSV, controlla le righe e conferma solo quelle corrette."
      />
      <Rule />
      <section className="-mx-4 px-5 py-6 sm:-mx-6 lg:-mx-8">
        <CraftedImportUploadForm />
        <CraftedImportBatchList batches={batches} />
      </section>
    </main>
  );
}
