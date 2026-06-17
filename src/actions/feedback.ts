"use server";

import { prisma } from "@/src/lib/prisma";
import { getAuthenticatedUser } from "@/src/lib/auth/session";
import { ensureAppUserForAuthUser } from "@/src/lib/auth/provisioning";
import { getCurrentWorkspaceId } from "@/src/lib/workspace-context";
import { validateFeedback } from "@/src/features/feedback/validation";
import {
  guardFeedbackRateLimit,
  FEEDBACK_IP_RULE,
  FEEDBACK_USER_RULE,
} from "@/src/features/feedback/submit-guard";
import {
  checkRateLimit,
  getClientIpFromRequestHeaders,
} from "@/src/lib/rate-limit";

export type FeedbackActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
};

const APP_VERSION = "0.1.0";

function getString(formData: FormData, name: string): string {
  const val = formData.get(name);
  return typeof val === "string" ? val.trim() : "";
}

export async function submitFeedback(
  _prev: FeedbackActionState,
  formData: FormData,
): Promise<FeedbackActionState> {
  const result = validateFeedback({
    type: getString(formData, "type"),
    message: getString(formData, "message"),
    route: getString(formData, "route") || undefined,
    userAgent: getString(formData, "userAgent") || undefined,
    viewport: getString(formData, "viewport") || undefined,
    timezone: getString(formData, "timezone") || undefined,
    locale: getString(formData, "locale") || undefined,
    displayMode: getString(formData, "displayMode") || undefined,
  });

  if (!result.valid || !result.data) {
    return {
      success: false,
      message: "Controlla i campi evidenziati.",
      errors: result.errors,
    };
  }

  let userId: string | null = null;
  let workspaceId: string | null = null;

  try {
    const authenticatedUser = await getAuthenticatedUser();
    const appUser = authenticatedUser
      ? await ensureAppUserForAuthUser(authenticatedUser)
      : null;

    userId = appUser?.id ?? null;
  } catch {
    // auth context unavailable — feedback still accepted anonymously
  }

  // Rate limit: 5/10 min per IP (always), 20/day per user (when authenticated).
  // If the rate-limit DB check itself fails, fall through rather than blocking.
  try {
    const clientIp = await getClientIpFromRequestHeaders();
    const ipLimit = await checkRateLimit(FEEDBACK_IP_RULE, [clientIp]);
    const userLimit = userId
      ? await checkRateLimit(FEEDBACK_USER_RULE, [userId])
      : null;

    const guard = guardFeedbackRateLimit(ipLimit, userLimit);
    if (!guard.allowed) {
      return { success: false, message: guard.message };
    }
  } catch (error) {
    console.error("[feedback] Rate limit check failed:", error);
  }

  try {
    workspaceId = await getCurrentWorkspaceId();
  } catch {
    // workspace context unavailable — feedback still accepted
  }

  try {
    await prisma.feedback.create({
      data: {
        userId,
        workspaceId,
        type: result.data.type,
        message: result.data.message,
        route: result.data.route,
        userAgent: result.data.userAgent,
        viewport: result.data.viewport,
        timezone: result.data.timezone,
        locale: result.data.locale,
        displayMode: result.data.displayMode,
        appVersion: APP_VERSION,
      },
    });

    return { success: true, message: "Grazie, feedback inviato." };
  } catch (error) {
    console.error("[feedback] Failed to save:", error);
    return {
      success: false,
      message: "Non sono riuscito a inviarlo. Riprova tra poco.",
    };
  }
}
