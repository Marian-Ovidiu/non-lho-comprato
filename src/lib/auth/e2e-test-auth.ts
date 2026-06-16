export const E2E_AUTH_COOKIE = "nlc-e2e-user-id";

export function isE2ETestAuthEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.E2E_TEST_AUTH_ENABLED?.trim().toLowerCase() === "true"
  );
}

export function assertE2ETestAuthEnabled() {
  if (!isE2ETestAuthEnabled()) {
    throw new Error("E2E test auth is disabled");
  }
}
