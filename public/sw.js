const CACHE_NAME = "nails-calendar-v4";
const APP_SHELL_CACHE = "nails-calendar-shell-v4";

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

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  // HTML / переходы:
  // пытаемся получить свежую страницу,
  // если сети нет — используем сохранённую главную.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response && response.status === 200) {
            const cache = await caches.open(APP_SHELL_CACHE);

            await cache.put("/", response.clone());
          }

          return response;
        })
        .catch(async () => {
          const shellCache =
            await caches.open(APP_SHELL_CACHE);

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
            await precache.match(OFFLINE_URL);

          if (offline) {
            return offline;
          }

          return new Response("Offline", {
            status: 503,
            headers: {
              "Content-Type":
                "text/plain; charset=utf-8",
            },
          });
        })
    );

    return;
  }

  // Next.js JS/CSS/chunks:
  // после первого онлайн-запуска сохраняем их.
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

  // Картинки, manifest и прочая статика:
  // сначала кэш, потом сеть.
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