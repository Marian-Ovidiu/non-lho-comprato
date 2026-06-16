export type WorkspaceScopedRecord = {
  workspaceId?: string | null;
  habit?: {
    workspaceId?: string | null;
  } | null;
};

export function assertWorkspaceRecord(
  record: WorkspaceScopedRecord | null,
  sessionWorkspaceId: string,
  resourceLabel = "record",
): void {
  if (!record) {
    throw new Error(`${resourceLabel} not found`);
  }
  const recordWorkspaceId = record.workspaceId ?? record.habit?.workspaceId ?? null;
  if (recordWorkspaceId !== sessionWorkspaceId) {
    throw new Error(`${resourceLabel} not found`);
  }
}
