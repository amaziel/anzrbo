// ANZRBO Service Worker kill-switch — neutralisation définitive.
// Ce fichier reste au même chemin pour reprendre le contrôle des anciens navigateurs,
// supprimer les anciens caches applicatifs, puis se désinscrire.

function isAppShellCache(name) {
  return /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-|anzrbo|workbox/i.test(name);
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.allSettled(cacheNames.filter(isAppShellCache).map((name) => caches.delete(name)));
        await self.clients.claim();
        const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        await Promise.allSettled(clients.map((client) => client.navigate(client.url)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  );
});

self.addEventListener("fetch", () => undefined);
