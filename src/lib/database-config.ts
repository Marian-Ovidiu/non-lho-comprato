type DatabaseUrlParts = {
  host: string;
  port: string;
  isSupabasePooler: boolean;
  isSupabaseDirect: boolean;
  isTransactionPooler: boolean;
  hasPgbouncerParam: boolean;
};

function isLocalDatabaseHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
}

function parseDatabaseUrl(value: string): DatabaseUrlParts | null {
  try {
    const url = new URL(value);
    const host = url.hostname;
    const port = url.port || "5432";
    const isSupabasePooler = host.includes("pooler.supabase.com");
    const isSupabaseDirect =
      host.startsWith("db.") && host.endsWith(".supabase.co");
    const isTransactionPooler = isSupabasePooler && port === "6543";
    const hasPgbouncerParam = url.searchParams.get("pgbouncer") === "true";

    return {
      host,
      port,
      isSupabasePooler,
      isSupabaseDirect,
      isTransactionPooler,
      hasPgbouncerParam,
    };
  } catch {
    return null;
  }
}

function appendQueryParam(url: string, key: string, value: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set(key, value);
  return parsed.toString();
}

function ensureSslParams(connectionString: string): string {
  let parsed: URL;

  try {
    parsed = new URL(connectionString);
  } catch {
    return connectionString;
  }

  if (isLocalDatabaseHost(parsed.hostname)) {
    return connectionString;
  }

  if (!parsed.searchParams.has("uselibpqcompat")) {
    parsed.searchParams.set("uselibpqcompat", "true");
  }

  if (!parsed.searchParams.has("sslmode")) {
    parsed.searchParams.set("sslmode", "require");
  }

  return parsed.toString();
}

export function normalizeRuntimeDatabaseUrl(connectionString: string): string {
  let normalized = ensureSslParams(connectionString.trim());
  const parts = parseDatabaseUrl(normalized);

  if (parts?.isTransactionPooler && !parts.hasPgbouncerParam) {
    normalized = appendQueryParam(normalized, "pgbouncer", "true");
  }

  return normalized;
}

export function getRuntimeDatabaseUrl(): string {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  return normalizeRuntimeDatabaseUrl(connectionString);
}

export function getMigrationDatabaseUrl(): string {
  const directUrl = process.env.DIRECT_URL?.trim();
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (directUrl) {
    return ensureSslParams(directUrl);
  }

  if (databaseUrl) {
    return normalizeRuntimeDatabaseUrl(databaseUrl);
  }

  throw new Error("DIRECT_URL or DATABASE_URL is required for Prisma migrations");
}

export function getDatabaseConnectionSnapshot() {
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  const directUrl = process.env.DIRECT_URL?.trim() ?? "";
  const runtimeParts = databaseUrl ? parseDatabaseUrl(databaseUrl) : null;
  const directParts = directUrl ? parseDatabaseUrl(directUrl) : null;

  return {
    databaseHost: runtimeParts?.host ?? (databaseUrl ? "invalid-url" : "missing"),
    databasePort: runtimeParts?.port ?? null,
    directDatabaseHost: directParts?.host ?? (directUrl ? "invalid-url" : "missing"),
    databaseConfigured: Boolean(databaseUrl),
    directDatabaseConfigured: Boolean(directUrl),
    supabasePooler: runtimeParts?.isSupabasePooler ?? false,
    supabaseDirectRuntime: runtimeParts?.isSupabaseDirect ?? false,
    supabaseTransactionPooler: runtimeParts?.isTransactionPooler ?? false,
    pgbouncerParam: runtimeParts?.hasPgbouncerParam ?? false,
  };
}

let loggedDatabaseHints = false;

export function logDatabaseConfigHints() {
  if (loggedDatabaseHints || process.env.NODE_ENV === "test") {
    return;
  }

  loggedDatabaseHints = true;
  const snapshot = getDatabaseConnectionSnapshot();

  if (!snapshot.databaseConfigured) {
    console.warn("[database] DATABASE_URL is not configured.");
    return;
  }

  if (snapshot.supabaseDirectRuntime) {
    console.warn(
      "[database] DATABASE_URL points to a direct Supabase host (db.*.supabase.co). " +
        "On Vercel use the Transaction pooler (*.pooler.supabase.com:6543) with ?pgbouncer=true.",
    );
    return;
  }

  if (snapshot.supabasePooler && !snapshot.supabaseTransactionPooler) {
    console.warn(
      "[database] DATABASE_URL uses Supabase session pooler (port 5432). " +
        "For serverless, prefer Transaction pooler on port 6543.",
    );
  }

  if (snapshot.supabaseTransactionPooler && !snapshot.pgbouncerParam) {
    console.warn(
      "[database] Transaction pooler detected without ?pgbouncer=true. " +
        "The app will add it automatically at runtime.",
    );
  }

  if (!snapshot.directDatabaseConfigured && process.env.NODE_ENV !== "production") {
    console.info(
      "[database] DIRECT_URL is not set. Prisma migrations will fall back to DATABASE_URL.",
    );
  }
}
