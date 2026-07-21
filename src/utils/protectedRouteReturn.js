import { trackEvent } from './analytics';

const INTENT_STORAGE_KEY = 'mercasto.protected_route_intent.v1';
const AUTH_TOKEN_KEY = 'auth_token';
const USER_STORAGE_KEY = 'user';
const REGISTRATION_FLAG_KEY = 'just_registered';
const STORAGE_PATCH_MARKER = '__mercastoProtectedPostReturn';
const INTENT_TTL_MS = 30 * 60 * 1000;
const AUTH_SETTLE_MS = 150;
const POLL_INTERVAL_MS = 50;
const FUNNEL_DEDUPE_MS = 1500;

let installed = false;
let pollTimer = null;
let authenticatedAt = 0;
let originalPushState = null;
let originalReplaceState = null;
let lastFunnelSignature = '';
let lastFunnelTrackedAt = 0;

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

function trackSellerFunnel(eventName, params = {}) {
  const signature = `${eventName}:${params.intent_path || ''}:${params.destination_path || ''}`;
  const now = Date.now();
  if (signature === lastFunnelSignature && now - lastFunnelTrackedAt < FUNNEL_DEDUPE_MS) return;

  lastFunnelSignature = signature;
  lastFunnelTrackedAt = now;
  trackEvent(eventName, params);
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

  const authenticated = Boolean(
    localStorage.getItem(AUTH_TOKEN_KEY) && localStorage.getItem(USER_STORAGE_KEY),
  );
  trackSellerFunnel('seller_post_intent', {
    intent_path: destination.path,
    authentication_state: authenticated ? 'authenticated' : 'anonymous',
  });

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

function installRegistrationOnboardingBypass() {
  if (typeof Storage === 'undefined') return;

  const currentSetItem = Storage.prototype.setItem;
  if (currentSetItem?.[STORAGE_PATCH_MARKER]) return;

  function protectedRouteSetItem(key, value) {
    let isLocalStorage = false;
    try {
      isLocalStorage = this === window.localStorage;
    } catch {
      // Fall through to the native implementation.
    }

    // The generic onboarding is useful for organic registrations, but it
    // blocks the paid seller flow after the visitor has explicitly chosen to
    // publish. Suppress only that one flag while a valid /post intent exists.
    if (isLocalStorage && key === REGISTRATION_FLAG_KEY && readIntent()) {
      return undefined;
    }

    return currentSetItem.call(this, key, value);
  }

  Object.defineProperty(protectedRouteSetItem, STORAGE_PATCH_MARKER, {
    value: true,
  });
  Storage.prototype.setItem = protectedRouteSetItem;
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
  trackSellerFunnel('seller_post_returned_after_auth', {
    intent_path: intent.path,
    intent_age_ms: Math.max(0, Date.now() - intent.capturedAt),
    registration_flag_present: Boolean(localStorage.getItem(REGISTRATION_FLAG_KEY)),
  });
  clearIntent();
  stopAuthWatcher();
  dispatchRouteChange(intent.state ?? null);
}

function startAuthWatcher() {
  if (pollTimer !== null) return;
  pollTimer = window.setInterval(restoreIntentWhenReady, POLL_INTERVAL_MS);
  restoreIntentWhenReady();
}

function abandonIntent(destinationPath) {
  const intent = readIntent();
  if (!intent) return;

  trackSellerFunnel('seller_post_intent_abandoned', {
    intent_path: intent.path,
    destination_path: destinationPath,
    intent_age_ms: Math.max(0, Date.now() - intent.capturedAt),
  });
  clearIntent();
  stopAuthWatcher();
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
    abandonIntent(destination.path);
  }
}

export function installProtectedRouteReturn() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  originalPushState = window.history.pushState;
  originalReplaceState = window.history.replaceState;
  installRegistrationOnboardingBypass();

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
      abandonIntent(destination.path);
    }
  });

  const current = destinationFrom(null);
  if (current && isProtectedPostRoute(current.pathname)) {
    writeIntent(current, window.history.state);
  } else if (readIntent()) {
    startAuthWatcher();
  }
}
