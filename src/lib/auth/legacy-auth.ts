const DEFAULT_LEGACY_WORKSPACE_ID = "legacy-workspace";
const DEFAULT_LEGACY_PRIMARY_USER_ID = "legacy-user-1";
const DEFAULT_LEGACY_SECONDARY_USER_ID = "legacy-user-2";
const DEFAULT_PRODUCTION_WORKSPACE_NAME = "Workspace condiviso";

export function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? null;
}

export function getLegacyWorkspaceId() {
  return process.env.LEGACY_WORKSPACE_ID?.trim() || DEFAULT_LEGACY_WORKSPACE_ID;
}

export function getLegacyPrimaryUserId() {
  return process.env.LEGACY_PRIMARY_USER_ID?.trim() || DEFAULT_LEGACY_PRIMARY_USER_ID;
}

export function getLegacySecondaryUserId() {
  return process.env.LEGACY_SECONDARY_USER_ID?.trim() || DEFAULT_LEGACY_SECONDARY_USER_ID;
}

export function isLegacyAuthBridgeEnabled() {
  return process.env.ENABLE_LEGACY_AUTH_BRIDGE?.trim().toLowerCase() === "true";
}

export function getProductionWorkspaceDisplayName() {
  return (
    process.env.PRODUCTION_WORKSPACE_NAME?.trim() ||
    DEFAULT_PRODUCTION_WORKSPACE_NAME
  );
}

export function getLegacyAuthMapping(email: string | null | undefined) {
  if (!isLegacyAuthBridgeEnabled()) {
    return null;
  }

  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const primaryEmail = normalizeEmail(process.env.LEGACY_PRIMARY_EMAIL);
  if (primaryEmail && normalizedEmail === primaryEmail) {
    return {
      userId: getLegacyPrimaryUserId(),
      workspaceId: getLegacyWorkspaceId(),
    };
  }

  const secondaryEmail = normalizeEmail(process.env.LEGACY_SECONDARY_EMAIL);
  if (secondaryEmail && normalizedEmail === secondaryEmail) {
    return {
      userId: getLegacySecondaryUserId(),
      workspaceId: getLegacyWorkspaceId(),
    };
  }

  return null;
}
