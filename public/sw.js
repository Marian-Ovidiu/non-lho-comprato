self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Intentionally a no-op fetch handler.
//
// Previously this did `event.respondWith(fetch(event.request))`, which re-issued
// every request through the service worker. When that re-fetch rejected (auth
// redirects, POST server actions, transient network errors) the navigation
// failed with "FetchEvent ... the promise was rejected" / "Failed to fetch".
//
// We keep a registered fetch handler (so the app stays installable as a PWA) but
// do not call respondWith, letting the browser handle every request natively.
self.addEventListener("fetch", () => {});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});
