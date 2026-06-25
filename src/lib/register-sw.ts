// Cache offline désactivé : évite définitivement les écrans noirs dus à une ancienne build.
export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const clearKnownCaches = async () => {
    if (!("caches" in window)) return;
    const names = await window.caches.keys();
    await Promise.allSettled(names.map((name) => window.caches.delete(name)));
  };

  navigator.serviceWorker
    .getRegistrations?.()
    .then(async (regs) => {
      await Promise.allSettled(regs.map((registration) => registration.unregister()));
      await clearKnownCaches();
    })
    .catch(() => {});
}
