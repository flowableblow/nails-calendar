const CACHE_NAME = "nails-calendar-v3";
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  "/offline",
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
            if (cacheName !== CACHE_NAME) {
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

  if (request.method !== "GET") {
    return;
  }

  // Страницы: сначала интернет, офлайн — наша заглушка.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);

        const offlinePage = await cache.match(OFFLINE_URL);

        return (
          offlinePage ||
          new Response("Offline", {
            status: 503,
            headers: {
              "Content-Type": "text/plain",
            },
          })
        );
      })
    );

    return;
  }

  // ВАЖНО:
  // JS/CSS Next.js НЕ кэшируем вручную.
  // Иначе после обновления приложение может запускать старый код.
  if (
    request.url.includes("/_next/") ||
    request.destination === "script" ||
    request.destination === "style"
  ) {
    event.respondWith(fetch(request));

    return;
  }

  // Только наши статические картинки можно брать из кэша.
  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(request);

      if (cached) {
        return cached;
      }

      return new Response("", {
        status: 503,
      });
    })
  );
});