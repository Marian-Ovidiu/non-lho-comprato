export const VALID_FEEDBACK_TYPES = ["bug", "suggestion", "confusion", "other"] as const;
export type FeedbackType = (typeof VALID_FEEDBACK_TYPES)[number];

export type FeedbackInput = {
  type: string;
  message: string;
  route?: string;
  userAgent?: string;
  viewport?: string;
  timezone?: string;
  locale?: string;
  displayMode?: string;
};

export type ValidatedFeedback = {
  type: FeedbackType;
  message: string;
  route: string | null;
  userAgent: string | null;
  viewport: string | null;
  timezone: string | null;
  locale: string | null;
  displayMode: string | null;
};

export type FeedbackValidationResult =
  | { valid: true; errors: Record<string, never>; data: ValidatedFeedback }
  | { valid: false; errors: Record<string, string>; data?: undefined };

function truncate(value: string | undefined, max: number): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export function validateFeedback(input: FeedbackInput): FeedbackValidationResult {
  const errors: Record<string, string> = {};

  if (!VALID_FEEDBACK_TYPES.includes(input.type as FeedbackType)) {
    errors.type = "Tipo non valido.";
  }

  const message = (input.message ?? "").trim();
  if (message.length < 3) {
    errors.message = "Scrivi almeno 3 caratteri.";
  } else if (message.length > 2000) {
    errors.message = "Il messaggio è troppo lungo (max 2000 caratteri).";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    data: {
      type: input.type as FeedbackType,
      message,
      route: truncate(input.route, 1000),
      userAgent: truncate(input.userAgent, 500),
      viewport: truncate(input.viewport, 50),
      timezone: truncate(input.timezone, 100),
      locale: truncate(input.locale, 20),
      displayMode: truncate(input.displayMode, 20),
    },
  };
}
