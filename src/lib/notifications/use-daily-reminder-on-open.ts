"use client";

import { useEffect } from "react";

import { getTodayDashboardSummary } from "@/src/actions/dashboard";
import { runDailyReminderOnOpen } from "@/src/lib/notifications/daily-reminder";

export function useDailyReminderOnOpen() {
  useEffect(() => {
    void runDailyReminderOnOpen(async () => {
      try {
        const summary = await getTodayDashboardSummary();
        return summary.entriesTodayCount > 0;
      } catch {
        return null;
      }
    });
  }, []);
}
