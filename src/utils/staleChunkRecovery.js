const STALE_ERROR_PATTERN = /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|chunkloaderror|loading chunk [^ ]+ failed|failed to load module script/i;
const RECOVERY_GUARD_KEY = 'mercasto.stale_chunk_recovery.v2';
const RECOVERY_EVENT_KEY = 'mercasto.stale_chunk_recovered.v1';
const RECOVERY_WINDOW_MS = 2 * 60 * 1000;

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function errorMessage(reason) {
  if (reason instanceof Error) return `${reason.name || ''} ${reason.message || ''}`.trim();
  if (reason && typeof reason === 'object') {
    return String(reason.message || reason.reason?.message || reason.error?.message || reason);
  }
  return String(reason || '');
}

export function isStaleChunkError(reason) {
  return STALE_ERROR_PATTERN.test(errorMessage(reason));
}

function currentRouteKey() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function readGuard() {
  try {
    const value = JSON.parse(sessionStorage.getItem(RECOVERY_GUARD_KEY) || 'null');
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

function writeGuard(message) {
  try {
    sessionStorage.setItem(RECOVERY_GUARD_KEY, JSON.stringify({
      route: currentRouteKey(),
      message: String(message || '').slice(0, 300),
      attemptedAt: Date.now(),
    }));
    sessionStorage.setItem(RECOVERY_EVENT_KEY, JSON.stringify({
      route: currentRouteKey(),
      attemptedAt: Date.now(),
    }));
  } catch {
    // Recovery must still work when storage is unavailable.
  }
}

function markPageNoIndex() {
  let robots = document.querySelector('meta[name="robots"]');
  if (!robots) {
    robots = document.createElement('meta');
    robots.setAttribute('name', 'robots');
    document.head.appendChild(robots);
  }
  robots.setAttribute('content', 'noindex,nofollow,noarchive');
}

function recoveryUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set('__mercasto_refresh', String(Date.now()));
  return url.href;
}

async function clearStaleFrontendState() {
  const tasks = [];

  if ('caches' in window) {
    tasks.push(
      window.caches.keys().then((keys) => Promise.all(keys.map((key) => window.caches.delete(key)))),
    );
  }

  if (navigator.serviceWorker) {
    tasks.push(
      navigator.serviceWorker.getRegistrations().then((registrations) => (
        Promise.all(registrations.map((registration) => registration.unregister()))
      )),
    );
  }

  await Promise.allSettled(tasks);
}

export async function recoverFromStaleChunk(reason) {
  if (!isBrowser() || !isStaleChunkError(reason) || window.__mercastoStaleRecoveryRunning) return false;

  const guard = readGuard();
  const sameRoute = guard?.route === currentRouteKey();
  const recentlyAttempted = Number.isFinite(guard?.attemptedAt)
    && Date.now() - guard.attemptedAt < RECOVERY_WINDOW_MS;

  if (sameRoute && recentlyAttempted) {
    markPageNoIndex();
    return false;
  }

  window.__mercastoStaleRecoveryRunning = true;
  const message = errorMessage(reason);
  writeGuard(message);
  markPageNoIndex();

  await clearStaleFrontendState();
  window.location.replace(recoveryUrl());
  return true;
}

function inspectRenderedErrorBoundary() {
  const bodyText = document.body?.innerText || '';
  if (!bodyText.includes('No pudimos cargar esta sección')) return;
  if (!isStaleChunkError(bodyText)) return;
  void recoverFromStaleChunk(bodyText);
}

function reportSuccessfulRecovery() {
  let recovered = null;
  try {
    recovered = JSON.parse(sessionStorage.getItem(RECOVERY_EVENT_KEY) || 'null');
    sessionStorage.removeItem(RECOVERY_EVENT_KEY);
    sessionStorage.removeItem(RECOVERY_GUARD_KEY);
  } catch {
    return;
  }

  if (!recovered) return;

  const url = new URL(window.location.href);
  if (url.searchParams.has('__mercasto_refresh')) {
    url.searchParams.delete('__mercasto_refresh');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'frontend_chunk_recovered',
    recovery_route: String(recovered.route || '').slice(0, 300),
    recovery_delay_ms: Math.max(0, Date.now() - Number(recovered.attemptedAt || Date.now())),
  });
}

export function installStaleChunkRecovery() {
  if (!isBrowser() || window.__mercastoStaleChunkRecoveryInstalled) return;
  window.__mercastoStaleChunkRecoveryInstalled = true;

  window.addEventListener('error', (event) => {
    const reason = event.error || event.message;
    if (isStaleChunkError(reason)) void recoverFromStaleChunk(reason);
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    if (isStaleChunkError(event.reason)) void recoverFromStaleChunk(event.reason);
  });

  const observer = new MutationObserver(inspectRenderedErrorBoundary);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', reportSuccessfulRecovery, { once: true });
  } else {
    reportSuccessfulRecovery();
  }
}
