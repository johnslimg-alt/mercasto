const route = `${location.pathname}${location.search}${location.hash}`;
const guardKey = 'mercasto.stale_module_fallback.v2';
const now = Date.now();
let recentlyRetried = false;

try {
  const guard = JSON.parse(sessionStorage.getItem(guardKey) || 'null');
  recentlyRetried = guard?.route === route
    && Number.isFinite(guard?.attemptedAt)
    && now - guard.attemptedAt < 2 * 60 * 1000;

  if (!recentlyRetried) {
    sessionStorage.setItem(guardKey, JSON.stringify({ route, attemptedAt: now }));
    sessionStorage.setItem('mercasto.stale_chunk_recovered.v1', JSON.stringify({ route, attemptedAt: now }));
  }
} catch {
  // Continue without storage in privacy-restricted browsers.
}

let robots = document.querySelector('meta[name="robots"]');
if (!robots) {
  robots = document.createElement('meta');
  robots.setAttribute('name', 'robots');
  document.head.appendChild(robots);
}
robots.setAttribute('content', 'noindex,nofollow,noarchive');

if (!recentlyRetried) {
  const refreshUrl = new URL(location.href);
  refreshUrl.searchParams.set('__mercasto_refresh', String(now));

  Promise.allSettled([
    globalThis.caches
      ? caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      : Promise.resolve(),
    navigator.serviceWorker
      ? navigator.serviceWorker.getRegistrations().then((registrations) => (
        Promise.all(registrations.map((registration) => registration.unregister()))
      ))
      : Promise.resolve(),
  ]).finally(() => location.replace(refreshUrl.href));
}

export default function StaleModuleFallback() {
  return null;
}
