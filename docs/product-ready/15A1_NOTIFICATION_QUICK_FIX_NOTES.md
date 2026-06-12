# Phase 15A.1 — Notification Quick Fix Notes

Date: 2026-06-12

No schema changes, no Web Push, no DB tables, no cron jobs.

---

## What Changed

### 1. Service worker — `notificationclick` handler (`public/sw.js`)

Added an event listener that:
1. Closes the notification immediately.
2. Focuses an already-open app window if one exists.
3. Opens `event.notification.data?.url ?? "/"` in a new window if no existing window is found.

This handler is required for SW-backed notifications (`registration.showNotification()`). Without it,
tapping a notification on Android PWA or iOS 16.4+ PWA had no effect.

### 2. SW-backed notification delivery (`src/lib/notifications/daily-reminder.ts`)

`showDailyReminderNotification` was changed from synchronous to `async` and now:

1. **Tries `registration.showNotification()` first** — guarded by
   `navigator.serviceWorker.controller !== null` to avoid a hanging `.ready` promise
   when no SW controls the page (first load, development mode, non-PWA browsers).
2. **Falls back to `new Notification()`** if the SW path fails or the guard fails.
3. Adds `data: { url: "/" }` to notification options so the `notificationclick` handler
   knows where to navigate.

The `runDailyReminderOnOpen` caller was updated to `await` the now-async function.

`getRomeNowMinutes(date)` was extracted and exported (wraps the private `getRomeHourMinute`
helper) so it can be used in the habit banner and tested independently.

### 3. SW-backed notifications + Rome timezone in habit reminder (`src/components/notifications/habit-reminder-banner.tsx`)

Four changes:

**a) Rome timezone for time comparison:**
`getNowMinutes(date)` used `date.getHours() * 60 + date.getMinutes()` (device local time).
Replaced with `getRomeNowMinutes(now)` imported from `daily-reminder.ts`. If a user's device is
set to UTC or another timezone, habit reminders no longer fire at the wrong local clock time.

**b) Rome-based date key for acknowledgment storage:**
`getLocalDateKey(date)` (device local) replaced with `getRomeTodayDateKey(now)` (imported from
`daily-reminder-storage.ts`). Acknowledgment storage keys now align with the server's Rome-based
notion of "today", preventing a stale-key scenario around Rome midnight on devices in other timezones.

**c) SW-backed notification delivery:**
`new Notification(...)` + `notification.onclick` replaced with the `showHabitReminderNotification`
helper. The helper applies the same guard-then-fallback pattern:
- SW path: `registration.showNotification("Controlla le abitudini di oggi", { ..., data: { url: "/habits" } })`
- Direct fallback: `new Notification(...)` with minimal `onclick` for desktop browsers

The `acknowledge` + `writeActiveIds` calls moved to run **before** `showHabitReminderNotification`
so deduplication holds even if the component re-renders while the async call is in flight.

**d) `pad` / `getLocalDateKey` / `getNowMinutes` helper functions removed** (replaced by imports).

### 4. Permission prompt copy (`src/components/notifications/notification-permission-prompt.tsx`)

Before: `"Attiva le notifiche per i promemoria quando l'app è aperta o installata."`
After:  `"Attiva le notifiche per i promemoria. Funzionano quando l'app è aperta."`

"o installata" was removed because it implied that installing as a PWA enables closed-app
(background) notifications. It does not — that requires Web Push (Phase 15B).

### 5. Habit banner copy (`src/components/notifications/habit-reminder-banner.tsx`)

Before: `"I promemoria funzionano quando l'app è aperta o installata."`
After:  `"I promemoria funzionano quando l'app è aperta."`

Same rationale as (4).

### 6. Tests (`src/lib/notifications/daily-reminder.test.ts`)

New test file with 10 tests covering:
- `getRomeNowMinutes` — summer CEST, winter CET, midnight boundary, minutes component
- `isAfterReminderHour` — true after 18:00, false before, false exactly at 18:00, true at 18:01, CET winter cases

---

## What Is Improved

| Before | After |
|---|---|
| `new Notification()` only — never works on iOS; unreliable on Android backgrounded tab | `registration.showNotification()` first — works on iOS 16.4+ Home Screen PWA; more reliable on Android PWA |
| Habit reminder time comparison used device local time | Habit reminder time comparison uses Europe/Rome |
| Acknowledgment date key used device local date | Acknowledgment date key uses Europe/Rome date |
| Tapping a notification (if it appeared) had no effect on mobile PWA | `notificationclick` handler opens/focuses the app |
| Permission prompt implied closed-app notifications | Copy is now accurate |

---

## What Still Does Not Work

These limitations are unchanged and require Web Push (Phase 15B) to fix:

| Limitation | Why | Required fix |
|---|---|---|
| Notifications when app is fully closed | `registration.showNotification()` is still client-side; no background push infrastructure | Web Push (VAPID + PushManager + server sender + cron) |
| iOS Safari (non-PWA, any version) | `Notification` API not supported in iOS browser | Cannot be fixed without PWA install |
| iOS PWA on iOS < 16.4 | Push notifications not supported | System limitation |
| Habit reminders on pages other than `/habits` | `HabitReminderBanner` only mounted at `/habits` | Move notification logic to `AppShell` (deferred: requires new data fetch) |
| SW `controller` null on first load | `clients.claim()` is async; first load before claim may fall back to `new Notification()` | Acceptable; `new Notification()` is a correct fallback for that one load |

---

## Risks and Follow-ups

**SW guard (`controller !== null`):** If the user has the app open in a browser tab where the SW
was just updated and `claim()` hasn't propagated yet, `controller` could briefly be null. The fallback
to `new Notification()` handles this gracefully. After one refresh the SW controls the page normally.

**`navigator.serviceWorker.ready` timeout:** Not guarded by a timeout. In pathological cases (SW
stuck in installing state) `.ready` can hang. Unlikely given the minimal SW implementation, but a
future improvement could add a `Promise.race` with a 2-second timeout.

**iOS icon:** `registration.showNotification()` on iOS 16.4+ PWA does not display the `icon` field
— Apple uses the app icon from the home screen instead. The `icon` field is harmless on iOS and
correct on Android.

**Phase 15B prerequisites:** When implementing Web Push, the `showHabitReminderNotification` helper
and `showDailyReminderNotification` function should be refactored to only handle the client-side
"app is open" scenario. Server-triggered push notifications will go through a separate server-side
path and the SW `push` event handler.

---

## Validation

```
npm run lint      ✓ (clean)
npm run typecheck ✓ (clean)
npm run test      ✓ 152 pass, 0 fail (10 new notification tests)
npm run build     ✓ all pages compiled
```
