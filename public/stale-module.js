const routeUrl = new URL(location.href);
routeUrl.searchParams.delete('__mercasto_refresh');
const route = `${routeUrl.pathname}${routeUrl.search}${routeUrl.hash}`;
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

// Observability contract: this module is what nginx serves for ANY missing hashed
// asset under /assets/ (try_files falls back to it and returns HTTP 200
// application/javascript). It renders null and throws nothing, so without a
// loud signal a chunk that never existed is indistinguishable from a component
// that legitimately rendered nothing -- which is exactly how a missing cookie
// banner became invisible to every harness and to CI. Say it out loud, and name
// it in a stable marker so tests and monitoring can key on it.
const FALLBACK_MARKER = 'stale-module fallback';
try {
  console.error(
    `[mercasto] ${FALLBACK_MARKER}: a requested hashed asset was not in the deployed bundle set. `
    + 'Silent-null render; auto-recovery ' + (recentlyRetried
      ? 'suppressed by the 2-minute per-route guard.'
      : 'will navigate to ?__mercasto_refresh shortly.') + ' Requested: ' + location.pathname,
  );
} catch {
  // Console may be patched away in privacy-restricted contexts; the sentinel in
  // sessionStorage remains the machine-readable signal.
}

export default function StaleModuleFallback() {
  return null;
}
