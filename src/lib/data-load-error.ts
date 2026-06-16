import { unstable_rethrow } from "next/navigation";

const GENERIC_LOAD_ERROR =
  "Non riesco a caricare i dati adesso. Riprova tra poco.";

export function formatDataLoadError(error: unknown): string {
  if (process.env.NODE_ENV === "production") {
    return GENERIC_LOAD_ERROR;
  }

  if (error instanceof Error) {
    return error.message || GENERIC_LOAD_ERROR;
  }

  const message = String(error);
  return message && message !== "undefined" ? message : GENERIC_LOAD_ERROR;
}

export function logAndRethrowDataLoadError(
  context: string,
  error: unknown,
): never {
  unstable_rethrow(error);
  console.error(`${context}:`, error);

  if (error instanceof Error) {
    throw error;
  }

  throw new Error(formatDataLoadError(error));
}
