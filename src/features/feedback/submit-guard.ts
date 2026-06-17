import type { RateLimitResult, RateLimitRule } from "@/src/lib/rate-limit";

export const FEEDBACK_IP_RULE: RateLimitRule = {
  scope: "feedback:submit:ip",
  limit: 5,
  windowSeconds: 10 * 60,
};

export const FEEDBACK_USER_RULE: RateLimitRule = {
  scope: "feedback:submit:user:day",
  limit: 20,
  windowSeconds: 24 * 60 * 60,
};

const RATE_LIMIT_MESSAGE =
  "Hai inviato troppi feedback in poco tempo. Riprova più tardi.";

export type FeedbackGuardResult =
  | { allowed: true }
  | { allowed: false; message: string };

/**
 * Pure decision function: given rate-limit results, returns whether the
 * submission should proceed. Accepts userResult=null for anonymous callers.
 */
export function guardFeedbackRateLimit(
  ipResult: RateLimitResult,
  userResult: RateLimitResult | null,
): FeedbackGuardResult {
  if (!ipResult.allowed) {
    return { allowed: false, message: RATE_LIMIT_MESSAGE };
  }
  if (userResult !== null && !userResult.allowed) {
    return { allowed: false, message: RATE_LIMIT_MESSAGE };
  }
  return { allowed: true };
}
