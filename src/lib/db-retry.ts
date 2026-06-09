import { Prisma } from "@/src/lib/generated/prisma/client";

const TRANSIENT_PRISMA_CODES = new Set([
  "P1001",
  "P1002",
  "P1008",
  "P1017",
  "P2024",
]);

const DEFAULT_RETRY_ATTEMPTS = 2;
const DEFAULT_RETRY_DELAY_MS = 150;

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.toLowerCase();
  }

  return String(error).toLowerCase();
}

export function isTransientDatabaseError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return TRANSIENT_PRISMA_CODES.has(error.code);
  }

  const message = getErrorMessage(error);

  return (
    message.includes("connection terminated") ||
    message.includes("connection timeout") ||
    message.includes("can't reach database server") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("too many connections") ||
    message.includes("remaining connection slots")
  );
}

export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  options?: {
    attempts?: number;
    delayMs?: number;
    label?: string;
  },
): Promise<T> {
  const attempts = options?.attempts ?? DEFAULT_RETRY_ATTEMPTS;
  const delayMs = options?.delayMs ?? DEFAULT_RETRY_DELAY_MS;
  let lastError: unknown;

  for (let attempt = 0; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isTransientDatabaseError(error) || attempt === attempts) {
        throw error;
      }

      const label = options?.label ? ` (${options.label})` : "";
      console.warn(
        `[database] transient error${label}, retry ${attempt + 1}/${attempts}:`,
        error instanceof Error ? error.message : error,
      );
      await sleep(delayMs * (attempt + 1));
    }
  }

  throw lastError;
}
