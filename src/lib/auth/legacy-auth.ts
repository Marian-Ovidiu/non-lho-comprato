const DEFAULT_LEGACY_WORKSPACE_ID = "legacy-marian-martina";
const DEFAULT_LEGACY_MARIAN_USER_ID = "legacy-marian";
const DEFAULT_LEGACY_MARTINA_USER_ID = "legacy-martina";
const DEFAULT_PRODUCTION_WORKSPACE_NAME = "Workspace condiviso";

export function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? null;
}

export function getLegacyWorkspaceId() {
  return process.env.LEGACY_WORKSPACE_ID?.trim() || DEFAULT_LEGACY_WORKSPACE_ID;
}

export function getLegacyPrimaryUserId() {
  return process.env.LEGACY_PRIMARY_USER_ID?.trim() || DEFAULT_LEGACY_MARIAN_USER_ID;
}

export function getLegacySecondaryUserId() {
  return process.env.LEGACY_SECONDARY_USER_ID?.trim() || DEFAULT_LEGACY_MARTINA_USER_ID;
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

  const marianEmail = normalizeEmail(process.env.LEGACY_MARIAN_EMAIL);
  if (marianEmail && normalizedEmail === marianEmail) {
    return {
      userId: getLegacyPrimaryUserId(),
      workspaceId: getLegacyWorkspaceId(),
    };
  }

  const martinaEmail = normalizeEmail(process.env.LEGACY_MARTINA_EMAIL);
  if (martinaEmail && normalizedEmail === martinaEmail) {
    return {
      userId: getLegacySecondaryUserId(),
      workspaceId: getLegacyWorkspaceId(),
    };
  }

  return null;
}
