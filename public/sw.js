const CACHE_NAME = "nails-calendar-v5";
const APP_SHELL_CACHE = "nails-calendar-shell-v5";

const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/publicbg-man.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== CACHE_NAME &&
              cacheName !== APP_SHELL_CACHE
            ) {
              return caches.delete(cacheName);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      body: event.data ? event.data.text() : "",
    };
  }

  const title = data.title || "Напоминание";
  const body =
    data.body ||
    "У вас скоро запись клиента.";

  const options = {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag:
      data.tag ||
      `appointment-${data.appointmentId || Date.now()}`,
    data: {
      url: data.url || "/",
      appointmentId:
        data.appointmentId || null,
    },
  };

  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  );
});

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const targetUrl =
      event.notification?.data?.url || "/";

    event.waitUntil(
      self.clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((clients) => {
          for (const client of clients) {
            if ("focus" in client) {
              if ("navigate" in client) {
                client.navigate(targetUrl);
              }

              return client.focus();
            }
          }

          if (self.clients.openWindow) {
            return self.clients.openWindow(
              targetUrl
            );
          }
        })
    );
  }
);

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (
            response &&
            response.status === 200
          ) {
            const cache =
              await caches.open(
                APP_SHELL_CACHE
              );

            await cache.put(
              "/",
              response.clone()
            );
          }

          return response;
        })
        .catch(async () => {
          const shellCache =
            await caches.open(
              APP_SHELL_CACHE
            );

          const cachedHome =
            await shellCache.match("/");

          if (cachedHome) {
            return cachedHome;
          }

          const precache =
            await caches.open(CACHE_NAME);

          const precachedHome =
            await precache.match("/");

          if (precachedHome) {
            return precachedHome;
          }

          const offline =
            await precache.match(
              OFFLINE_URL
            );

          if (offline) {
            return offline;
          }

          return new Response(
            "Offline",
            {
              status: 503,
              headers: {
                "Content-Type":
                  "text/plain; charset=utf-8",
              },
            }
          );
        })
    );

    return;
  }

  if (
    url.origin === self.location.origin &&
    url.pathname.startsWith("/_next/")
  ) {
    event.respondWith(
      caches
        .open(APP_SHELL_CACHE)
        .then(async (cache) => {
          const cached =
            await cache.match(request);

          if (cached) {
            return cached;
          }

          try {
            const response =
              await fetch(request);

            if (
              response &&
              response.status === 200
            ) {
              await cache.put(
                request,
                response.clone()
              );
            }

            return response;
          } catch {
            return (
              cached ||
              new Response("", {
                status: 503,
              })
            );
          }
        })
    );

    return;
  }

  if (
    url.origin === self.location.origin
  ) {
    event.respondWith(
      caches.match(request).then(
        async (cached) => {
          if (cached) {
            return cached;
          }

          try {
            const response =
              await fetch(request);

            if (
              response &&
              response.status === 200
            ) {
              const cache =
                await caches.open(
                  APP_SHELL_CACHE
                );

              await cache.put(
                request,
                response.clone()
              );
            }

            return response;
          } catch {
            return new Response("", {
              status: 503,
            });
          }
        }
      )
    );
  }
});