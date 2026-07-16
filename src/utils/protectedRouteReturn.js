const INTENT_STORAGE_KEY = 'mercasto.protected_route_intent.v1';
const AUTH_TOKEN_KEY = 'auth_token';
const USER_STORAGE_KEY = 'user';
const INTENT_TTL_MS = 30 * 60 * 1000;
const AUTH_SETTLE_MS = 150;
const POLL_INTERVAL_MS = 50;

let installed = false;
let pollTimer = null;
let authenticatedAt = 0;
let originalPushState = null;
let originalReplaceState = null;

function destinationFrom(url) {
  try {
    const destination = url == null
      ? new URL(window.location.href)
      : new URL(String(url), window.location.href);

    if (destination.origin !== window.location.origin) return null;

    return {
      pathname: destination.pathname,
      path: `${destination.pathname}${destination.search}${destination.hash}`,
    };
  } catch {
    return null;
  }
}

function isProtectedPostRoute(pathname) {
  return /^\/post\/?$/.test(pathname || '');
}

function clearIntent() {
  try {
    sessionStorage.removeItem(INTENT_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in privacy-restricted browsers.
  }
}

function writeIntent(destination, state) {
  if (!destination || !isProtectedPostRoute(destination.pathname)) return;

  const intent = {
    path: destination.path,
    state: state ?? null,
    capturedAt: Date.now(),
  };

  try {
    sessionStorage.setItem(INTENT_STORAGE_KEY, JSON.stringify(intent));
  } catch {
    try {
      sessionStorage.setItem(INTENT_STORAGE_KEY, JSON.stringify({
        ...intent,
        state: null,
      }));
    } catch {
      return;
    }
  }

  startAuthWatcher();
}

function readIntent() {
  try {
    const raw = sessionStorage.getItem(INTENT_STORAGE_KEY);
    if (!raw) return null;

    const intent = JSON.parse(raw);
    const destination = destinationFrom(intent?.path);
    if (!destination || !isProtectedPostRoute(destination.pathname)) {
      clearIntent();
      return null;
    }

    if (!Number.isFinite(intent?.capturedAt) || Date.now() - intent.capturedAt > INTENT_TTL_MS) {
      clearIntent();
      return null;
    }

    return {
      path: destination.path,
      state: intent.state ?? null,
      capturedAt: intent.capturedAt,
    };
  } catch {
    clearIntent();
    return null;
  }
}

function stopAuthWatcher() {
  if (pollTimer !== null) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
  authenticatedAt = 0;
}

function dispatchRouteChange(state) {
  try {
    window.dispatchEvent(new PopStateEvent('popstate', { state }));
  } catch {
    window.dispatchEvent(new Event('popstate'));
  }
}

function restoreIntentWhenReady() {
  const intent = readIntent();
  if (!intent) {
    stopAuthWatcher();
    return;
  }

  const hasAuthenticatedSession = Boolean(
    localStorage.getItem(AUTH_TOKEN_KEY) && localStorage.getItem(USER_STORAGE_KEY),
  );
  const current = destinationFrom(null);

  // A newly requested protected route is briefly current before RequireAuth
  // replaces it with /. Keep the intent until authentication actually exists.
  if (current?.path === intent.path) {
    if (hasAuthenticatedSession) {
      clearIntent();
      stopAuthWatcher();
    }
    return;
  }

  if (!hasAuthenticatedSession) {
    authenticatedAt = 0;
    return;
  }

  if (!authenticatedAt) {
    authenticatedAt = Date.now();
    return;
  }

  if (Date.now() - authenticatedAt < AUTH_SETTLE_MS) return;

  originalReplaceState.call(window.history, intent.state ?? {}, '', intent.path);
  clearIntent();
  stopAuthWatcher();
  dispatchRouteChange(intent.state ?? null);
}

function startAuthWatcher() {
  if (pollTimer !== null) return;
  pollTimer = window.setInterval(restoreIntentWhenReady, POLL_INTERVAL_MS);
  restoreIntentWhenReady();
}

function handleNavigation(url, state) {
  const destination = destinationFrom(url);
  if (!destination) return;

  if (isProtectedPostRoute(destination.pathname)) {
    writeIntent(destination, state);
    return;
  }

  // RequireAuth currently replaces /post with the plain home route while the
  // authentication modal is open. Keep the intent for that one transition,
  // but discard it once the visitor deliberately navigates elsewhere.
  if (destination.path !== '/' && readIntent()) {
    clearIntent();
    stopAuthWatcher();
  }
}

export function installProtectedRouteReturn() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  originalPushState = window.history.pushState;
  originalReplaceState = window.history.replaceState;

  window.history.pushState = function pushState(state, title, url) {
    const result = originalPushState.call(this, state, title, url);
    handleNavigation(url, state);
    return result;
  };

  window.history.replaceState = function replaceState(state, title, url) {
    const result = originalReplaceState.call(this, state, title, url);
    handleNavigation(url, state);
    return result;
  };

  window.addEventListener('popstate', () => {
    const destination = destinationFrom(null);
    if (!destination) return;

    if (isProtectedPostRoute(destination.pathname)) {
      writeIntent(destination, window.history.state);
    } else if (destination.path !== '/' && readIntent()) {
      clearIntent();
      stopAuthWatcher();
    }
  });

  const current = destinationFrom(null);
  if (current && isProtectedPostRoute(current.pathname)) {
    writeIntent(current, window.history.state);
  } else if (readIntent()) {
    startAuthWatcher();
  }
}
