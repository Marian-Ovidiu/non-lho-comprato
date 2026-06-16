import { getDatabaseConnectionSnapshot } from "@/src/lib/database-config";
import { prisma } from "@/src/lib/prisma";

const DEFAULT_LEGACY_WORKSPACE_ID = "legacy-workspace";

function getLegacyWorkspaceIdForDebug() {
  return process.env.LEGACY_WORKSPACE_ID?.trim() || DEFAULT_LEGACY_WORKSPACE_ID;
}

export function isWorkspaceDebugEnabled() {
  return process.env.DEBUG_WORKSPACE?.trim().toLowerCase() === "true";
}

export function logWorkspaceDebug(
  source: string,
  payload: Record<string, unknown>,
) {
  if (!isWorkspaceDebugEnabled()) {
    return;
  }

  console.info(`[workspace-debug] ${source}`, payload);
}

export function getWorkspaceEnvSnapshot() {
  const database = getDatabaseConnectionSnapshot();

  return {
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    vercelEnv: process.env.VERCEL_ENV ?? "none",
    vercelUrl: process.env.VERCEL_URL ?? "none",
    legacyWorkspaceIdEnv: process.env.LEGACY_WORKSPACE_ID?.trim() || "(default)",
    legacyWorkspaceIdResolved: getLegacyWorkspaceIdForDebug(),
    productionWorkspaceNameEnv:
      process.env.PRODUCTION_WORKSPACE_NAME?.trim() || "(default)",
    legacyPrimaryEmailConfigured: Boolean(process.env.LEGACY_PRIMARY_EMAIL?.trim()),
    legacySecondaryEmailConfigured: Boolean(
      process.env.LEGACY_SECONDARY_EMAIL?.trim(),
    ),
    databaseHost: database.databaseHost,
    databasePort: database.databasePort,
    directDatabaseHost: database.directDatabaseHost,
    databaseConfigured: database.databaseConfigured,
    directDatabaseConfigured: database.directDatabaseConfigured,
    supabasePooler: database.supabasePooler,
    supabaseDirectRuntime: database.supabaseDirectRuntime,
    supabaseTransactionPooler: database.supabaseTransactionPooler,
    pgbouncerParam: database.pgbouncerParam,
    debugWorkspaceEnabled: isWorkspaceDebugEnabled(),
  };
}

export async function getWorkspaceEntryCounts(workspaceId: string) {
  const [scopedCount, nullWorkspaceCount] = await Promise.all([
    prisma.entry.count({
      where: { workspaceId },
    }),
    Promise.resolve(0), // workspaceId is non-nullable; orphans are impossible
  ]);

  return {
    workspaceId,
    entryCount: scopedCount,
    nullWorkspaceIdEntryCount: nullWorkspaceCount,
  };
}

export async function logWorkspaceResolutionSnapshot(input: {
  source: string;
  authUserId: string;
  authUserEmail: string | null;
  appUserId: string;
  selectedWorkspaceId: string | null;
  resolvedWorkspace: {
    id: string;
    name: string;
    kind: string;
  };
  accessibleWorkspaces: Array<{
    id: string;
    name: string;
    kind: string;
  }>;
  resolutionPath?: string;
}) {
  if (!isWorkspaceDebugEnabled()) {
    return;
  }

  const productionWorkspaceId = getLegacyWorkspaceIdForDebug();
  const [resolvedCounts, productionCounts, totalEntries] = await Promise.all([
    getWorkspaceEntryCounts(input.resolvedWorkspace.id),
    getWorkspaceEntryCounts(productionWorkspaceId),
    prisma.entry.count(),
  ]);

  logWorkspaceDebug(input.source, {
    ...getWorkspaceEnvSnapshot(),
    authUserId: input.authUserId,
    authUserEmail: input.authUserEmail,
    appUserId: input.appUserId,
    selectedWorkspaceId: input.selectedWorkspaceId,
    resolvedWorkspaceId: input.resolvedWorkspace.id,
    resolvedWorkspaceName: input.resolvedWorkspace.name,
    resolvedWorkspaceKind: input.resolvedWorkspace.kind,
    productionWorkspaceId,
    resolutionPath: input.resolutionPath,
    accessibleWorkspaces: input.accessibleWorkspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      kind: workspace.kind,
    })),
    entryCountResolvedWorkspace: resolvedCounts.entryCount,
    entryCountLegacyWorkspace: productionCounts.entryCount,
    entryCountNullWorkspaceId: resolvedCounts.nullWorkspaceIdEntryCount,
    entryCountTotalDatabase: totalEntries,
  });
}
