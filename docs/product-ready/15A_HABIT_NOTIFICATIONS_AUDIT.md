# Phase 15A — Habit Notifications Audit

Date: 2026-06-12

No application code, tests, or schema were modified.

---

## 1. Current Implementation Map

### 1.1 Service worker (`public/sw.js`)

A minimal three-handler file:

```
install  → self.skipWaiting()
activate → self.clients.claim()
fetch    → no-op (respondWith intentionally not called)
```

**No `push` event listener.** No `notificationclick` handler. No background sync. The service
worker exists solely to make the app installable as a PWA (a registered fetch handler is
required by the browser's installability criteria). It does not participate in notifications
in any way.

### 1.2 Web App Manifest (`app/manifest.ts`)

Standard PWA manifest: name, icons (192/512 maskable + any), `display: standalone`,
`display_override: ["standalone", "fullscreen"]`, theme color, start URL.

**No VAPID public key. No `gcm_sender_id`.** Nothing that enables Web Push.

### 1.3 Service worker registration (`src/components/pwa/register-sw.tsx`)

- Registers `/sw.js` in production only (`process.env.NODE_ENV !== "production"` guard).
- Also renders `<NotificationPermissionPrompt />` unconditionally (production + dev).
- Mounted in `app/layout.tsx` at the root — runs on every page.

### 1.4 Notification permission prompt (`src/components/notifications/notification-permission-prompt.tsx`)

- Waits for a user gesture (`pointerdown` or `keydown`) before showing.
- Calls `Notification.requestPermission()` — the browser Notification API.
- Shows only when `Notification.permission === "default"` (not yet decided).
- Prompt text: *"Attiva le notifiche per i promemoria quando l'app è aperta o installata."*

This requests the standard browser Notification permission. It does **not** set up a Push
subscription.

### 1.5 Daily reminder system

Three files:

| File | Role |
|---|---|
| `daily-reminder-storage.ts` | localStorage read/write for "sent today" dedup, keyed by Rome date |
| `daily-reminder.ts` | Logic: `shouldTriggerDailyReminder`, `showDailyReminderNotification`, `runDailyReminderOnOpen` |
| `use-daily-reminder-on-open.ts` | React hook: runs `runDailyReminderOnOpen` once in a `useEffect` |

**Trigger conditions (all must be true):**
1. `Notification.permission === "granted"`
2. Current Rome time is strictly after 18:00
3. `wasNotificationSentToday()` returns false (checks localStorage)
4. `hasTodayEntries` is false (calls `getTodayDashboardSummary` — requires auth)

**How notification fires:** `new Notification(title, { body, icon, tag })` — the browser
Notification API called directly from page context.

**Where it runs:** `useDailyReminderOnOpen()` is called inside `AppShell` (line 136 of
`app-shell.tsx`), so it runs once on every page mount as long as the user is authenticated.

**Timezone:** Rome (`Europe/Rome`) via `Intl.DateTimeFormat` — correct.

**Deduplication:** localStorage key `lastNotificationDate` stores the last Rome date a
notification was sent. One notification per calendar day maximum.

### 1.6 Habit-specific reminder system (`src/components/notifications/habit-reminder-banner.tsx`)

A client component that:

1. Re-evaluates every 60 seconds (and on `focus`, `pageshow`, `visibilitychange`)
2. Filters occurrences: `status=pending`, `habit.isActive=true`, `habit.reminderEnabled=true`,
   `reminderTime <= nowMinutes` (local device time), not yet acknowledged
3. **If `Notification.permission === "granted"`**: fires `new Notification(...)` immediately
   for all due unacknowledged reminders, then marks them acknowledged in localStorage/sessionStorage.
   The banner itself returns `null` (invisible).
4. **If permission NOT granted**: stores active reminder IDs in localStorage and renders an
   in-app banner card.

**Critical structural issue:** `HabitReminderBanner` is mounted **only on `/app/habits/page.tsx`**.
It is not in `AppShell` and is not on any other route. A habit reminder due at 09:30 will only
fire if the user happens to be on `/habits` at that moment.

**Timezone:** `getNowMinutes(date)` uses `date.getHours() * 60 + date.getMinutes()` — **device
local time**, not Rome time. If the device timezone differs from Rome, reminder times are
effectively wrong.

### 1.7 Schema: no push subscription model

`prisma/schema.prisma` has two reminder fields on the `Habit` model:

```prisma
reminderEnabled Boolean  @default(false)
reminderTime    String?  // HH:mm local string, e.g. "09:30"
```

**No `PushSubscription` table.** No endpoint, authentication key, or p256dh field. The DB
stores the *intent* to remind but has no mechanism to actually deliver the reminder when the
app is closed.

### 1.8 No Push API usage anywhere

Searched all `.ts` / `.tsx` files for: `PushManager`, `pushSubscription`, `subscribe(`,
`vapid`, `webpush`, `web-push`, `push_subscription`, service worker `push` event.

**Result: zero matches outside `node_modules`.** The Push API is completely unimplemented.

### 1.9 No server-side scheduler

Searched for: `cron`, `schedule`, `setInterval` (outside UI timers), `setTimeout` (outside UI),
webhook patterns, background job queues.

**Result:** No server-side notification scheduler exists. The closest thing is:
- `habit-reminder-banner.tsx`: a 60-second `window.setInterval` in the client browser
- `HabitsPage` calls `finalizeOldPendingOccurrences()` on page load (not a scheduler, just
  a cleanup sweep triggered by page visits)

---

## 2. Answers to the 8 Audit Questions

### Q1: Are notifications expected to work when the app is closed?

**No.** The current implementation uses `new Notification()` from page context, which requires
the page (tab or PWA window) to be open and in the foreground or at least loaded in a
background tab. There is no Web Push infrastructure, so closed-app delivery is architecturally
impossible with the current code.

The permission prompt copy says *"quando l'app è aperta o installata"* — this correctly sets
limited expectations, but "installata" creates a false impression: installing as a PWA does not
enable background notifications without Web Push.

### Q2: Are they expected to work only while the app is open?

**Yes, that is the current design.** Both notification paths (`new Notification()` in daily
reminder and habit reminder banner) require the page JS to be running. The habit banner requires
the user to be specifically on `/habits`.

### Q3: Is Push API subscription implemented?

**No.** `PushManager.subscribe()` is never called. No VAPID keys exist. No push endpoint exists
on the server. The Push API is entirely absent.

### Q4: Is a push subscription saved to DB?

**No.** The schema has no `PushSubscription` model. The Prisma client has no push-related types.

### Q5: Is there a server-side scheduler that sends reminders?

**No.** Reminder delivery is 100% client-side, contingent on the browser tab being open.

### Q6: Is timezone handled?

**Partially.** The daily reminder module (`daily-reminder.ts`) correctly uses Rome time via
`Intl.DateTimeFormat` with `timeZone: "Europe/Rome"`. The habit reminder banner
(`habit-reminder-banner.tsx`) uses **device local time** (`date.getHours()`) — not Rome time.
For a couple who may use devices in different timezones (travel, CET/CEST transitions), habit
reminder times will be wrong on the device whose clock differs.

### Q7: Are iOS Home Screen PWA requirements documented in-app?

**Not for notifications.** The PWA install UI (`crafted-pwa-install.tsx`) correctly guides iOS
users through "Share → Add to Home Screen → Confirm". However, there is no in-app mention of
the iOS notification limitation (iOS 16.4+ only, requires Home Screen install, requires
`registration.showNotification()` not `new Notification()`).

### Q8: What is the minimum viable implementation to make habit reminders reliable?

See Section 5.

---

## 3. Missing Pieces

| Capability | Required for | Current state |
|---|---|---|
| `registration.showNotification()` | Any PWA notification on iOS 16.4+; required for Android when tab is backgrounded | Not implemented — uses `new Notification()` only |
| `HabitReminderBanner` on all routes | Reminders fire regardless of current page | Only on `/habits` |
| Rome timezone in habit reminder check | Correct reminder time regardless of device locale | Not implemented — uses device local time |
| `push` event handler in service worker | Any background / closed-app notification | Absent |
| `PushManager.subscribe()` on client | Web Push subscription | Absent |
| `PushSubscription` DB model | Persisting device push tokens | Absent |
| Server-side push sender | Delivering notification when app is closed | Absent |
| VAPID key pair | Authenticating server-to-push-service communication | Absent |
| Server-side scheduler / cron | Triggering reminder dispatch at the right time | Absent |

---

## 4. Platform Limitations

### Android Chrome (browser tab open)

`new Notification()` works when the tab is visible. If the tab is backgrounded but not
closed, it may still work depending on Android's battery management. Works correctly.

### Android Chrome (installed PWA, app open)

`new Notification()` works in standalone mode. Same caveats as above.

### Android Chrome (app closed or backgrounded)

`new Notification()` does NOT fire. Requires Web Push + service worker `push` handler +
`registration.showNotification()`. **Currently broken.**

### iOS Safari (browser tab)

`new Notification()` is NOT supported on iOS Safari regardless of iOS version. The
`"Notification" in window` check returns `false`. The permission prompt will never show.
**Notifications are completely non-functional on iOS in browser mode.**

### iOS Safari (installed as Home Screen PWA, iOS < 16.4)

Notifications are not supported. Same as browser mode.

### iOS Safari (installed as Home Screen PWA, iOS ≥ 16.4)

Web Push notifications are supported. However the current implementation:
1. Uses `new Notification()` instead of `registration.showNotification()` — will not work
2. Has no Web Push subscription flow
3. Has no server-side push sender

**Currently broken on iOS regardless of installation method.**

### Desktop Chrome/Firefox/Edge (browser tab open)

`new Notification()` works. Daily reminder and habit reminder (on `/habits` only) are
functional. This is likely the only environment where the current implementation works end-to-end.

### Desktop — tab closed

`new Notification()` does not fire. No Web Push means no delivery.

---

## 5. Recommended Implementation Plan

### Tier 1 — Fix what exists (no Web Push, works when app is open)

These fixes require no new infrastructure. They would make the current system reliable for
users who keep the app open.

**5.1 Move `HabitReminderBanner` to `AppShell`**

Currently only on `/habits`. Moving it to `AppShell` means habit reminders fire on any
page. This is a 5-line change: import and mount `HabitReminderBanner` in `AppShell`,
passing `todayOccurrences` via a server action call or prop.

The tricky part: `HabitReminderBanner` needs occurrence data. Options:
- Add a client-side fetch for today's occurrences in the shell (adds a request on every page)
- Use a React context populated from the habits page
- Extract the notification-firing logic from the banner into a standalone hook that runs in
  the shell, and let the banner UI stay on `/habits`

Recommended: extract the Notification-firing logic into a standalone hook
`useHabitNotifications(occurrences)` that runs in `AppShell` with a lazy fetch of today's
occurrences. The in-app banner fallback stays on `/habits` only (it is already contextual to
that page).

**5.2 Use `registration.showNotification()` instead of `new Notification()`**

Replace `new Notification(title, options)` calls in both:
- `daily-reminder.ts` → `showDailyReminderNotification()`
- `habit-reminder-banner.tsx` → the notification creation block

With:
```ts
const registration = await navigator.serviceWorker.ready;
await registration.showNotification(title, options);
```

This is required for iOS 16.4+ Home Screen PWA support and is the correct API for PWAs.
Add `notificationclick` handler to `public/sw.js` to handle taps on the notification
(open/focus the app window).

**5.3 Use Rome timezone in habit reminder time comparison**

In `habit-reminder-banner.tsx`, replace `getNowMinutes(date)` (which uses device local time)
with a Rome-time-aware version:

```ts
function getRomeNowMinutes(date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find(p => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find(p => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}
```

**5.4 Add `notificationclick` to service worker**

```js
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const client = clients.find((c) => c.url.startsWith(self.location.origin));
      if (client) return client.focus();
      return self.clients.openWindow("/habits");
    })
  );
});
```

---

### Tier 2 — Background / closed-app notifications (Web Push)

This requires new infrastructure but is the only path to reliable notifications on mobile.

**5.5 VAPID key generation**

Generate a VAPID key pair (one-time, at deploy time):
```sh
npx web-push generate-vapid-keys
```

Store the private key as an environment secret (`VAPID_PRIVATE_KEY`). Store the public key
as a public environment variable (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`).

**5.6 `PushSubscription` model in DB**

```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**5.7 Client-side Push subscription**

After notification permission is granted, call `PushManager.subscribe()` with the VAPID
public key and POST the subscription to a server endpoint:

```ts
const registration = await navigator.serviceWorker.ready;
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: NEXT_PUBLIC_VAPID_PUBLIC_KEY,
});
await fetch("/api/push/subscribe", {
  method: "POST",
  body: JSON.stringify(subscription),
});
```

This should happen right after `Notification.requestPermission()` returns `"granted"` in
`NotificationPermissionPrompt`.

**5.8 `/api/push/subscribe` endpoint**

A Next.js route handler that receives the subscription, validates authentication, and upserts
into `PushSubscription` (keyed by `endpoint`).

**5.9 `push` event handler in service worker**

```js
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Notifica", {
      body: data.body,
      icon: data.icon ?? "/icons/icon-192.png",
      tag: data.tag,
      data: { url: data.url ?? "/" },
    })
  );
});
```

**5.10 Server-side push sender**

A function that:
1. Receives userId + notification payload
2. Fetches all `PushSubscription` rows for that user
3. Calls `web-push.sendNotification()` for each endpoint
4. Deletes any subscription that returns 410 (Gone — device unsubscribed)

**5.11 Server-side scheduler**

Options (cheapest first):
- **Vercel Cron** (`vercel.json` with `crons` config): free on Hobby, runs at UTC times.
  Call a Next.js route handler that queries habits with `reminderEnabled=true`, calculates
  which ones are due within ±1 minute in Rome time, and sends push notifications.
- **Supabase Edge Functions + pg_cron**: run a cron job in the DB layer.
- **External scheduler** (e.g., GitHub Actions workflow, cron-job.org): POST to a protected
  Next.js API endpoint.

Recommended: Vercel Cron running every minute (or every 5 minutes with a window check):
```json
// vercel.json
{
  "crons": [
    { "path": "/api/notifications/send-habit-reminders", "schedule": "* * * * *" }
  ]
}
```

The handler checks which habits have `reminderEnabled=true`, `reminderTime` within the
current minute in Rome time, and today's occurrence still `pending`, then sends Web Push
to subscribed devices.

---

## 6. Privacy and Data Notes

### Current state (no Web Push)

No push subscription data is stored. The only persistent notification data is:
- `localStorage: lastNotificationDate` — a date string (Rome format), one per device
- `localStorage: habit-reminder-active:*` — acknowledged habit occurrence IDs, per-device

Both live only on the user's device and are never sent to the server.

### Web Push (Tier 2)

Push subscription data includes:
- `endpoint` — a device-specific URL provided by the browser's push service (FCM for Chrome,
  APNs-bridge for Safari). These are pseudonymous device tokens.
- `p256dh` and `auth` — cryptographic keys used to encrypt the notification payload.

**GDPR classification:** Push subscription endpoints are identifiers linked to a specific
device and user. They should be:
- Stored encrypted at rest (or at minimum, access-controlled)
- Deleted when the user logs out or revokes notification permission
- Mentioned in the privacy policy as "push notification tokens"
- Subject to the right to erasure (already handled if cascade-deleted with User)

**Payload encryption:** The `web-push` library encrypts the notification body end-to-end using
the `p256dh` and `auth` keys. The push service (FCM, APNs) sees the endpoint but not the
notification content. This is acceptable for habit reminder content (which is non-sensitive).

---

## 7. Risks and Things Not to Change

### Risks

**iOS silent failure**: Users on iOS grant notification permission (the prompt appears in
Safari via the standard API), but no notification ever fires because `new Notification()`
is silently unsupported. The user has no feedback that the feature is broken on their device.
Until `registration.showNotification()` is implemented, iOS notifications should be explicitly
described as "not yet supported on iPhone" or the permission prompt should detect iOS and skip.

**`HabitReminderBanner` only on `/habits`**: This is the most immediately fixable production
issue. A user who has configured a 09:30 habit reminder but navigates to the dashboard at
09:30 never sees any notification. The current behavior is misleading.

**`new Notification()` in background tabs**: Chrome and Firefox may throttle or drop
`new Notification()` calls from background tabs depending on the user's OS notification
settings and browser version. The service worker path is more reliable.

**localStorage as dedup store**: If the user clears site data, dedup keys are lost and
notifications may repeat on next app open. This is acceptable for now but could cause
double-firing after a browser update or storage clear.

**Vercel Cron 1-minute granularity**: If using Vercel Cron for Tier 2, the minimum interval
is 1 minute. A habit set to `09:30` will be triggered between `09:30:00` and `09:30:59`
depending on cron execution timing. Acceptable for daily reminders.

**Multiple devices**: If a user has the app on two devices, Tier 2 Web Push will send to
both. For couple habits (shared occurrences), both members would receive the reminder.
Deduplication logic (mark occurrence as acknowledged after first interaction) should propagate
via DB state, which it already does through `syncOccurrenceStatus`.

### Things not to change

- The `reminderEnabled` / `reminderTime` schema fields — these are correct and already in use.
- The `HabitReminderBanner` in-app fallback — it should be kept for users without notification
  permission, it provides a visible reminder even without the Notification API.
- The localStorage-based "sent today" dedup in `daily-reminder-storage.ts` — this is the
  right architecture for the daily reminder use case, regardless of the delivery mechanism.
- The permission prompt's "wait for user gesture" design — this is required by browsers to
  avoid blocked permission prompts and is the correct approach.
