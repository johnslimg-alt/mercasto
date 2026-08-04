import { trackEvent } from './analytics';
import { protectedIntentKind } from './protectedIntent';

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
      search: destination.search,
      path: `${destination.pathname}${destination.search}${destination.hash}`,
    };
  } catch {
    return null;
  }
}

function protectedIntentFor(destination) {
  if (!destination) return null;
  const kind = protectedIntentKind(destination.pathname, destination.search);
  return kind ? { ...destination, kind } : null;
}

function trackSellerFunnel(eventName, params = {}) {
  const signature = `${eventName}:${params.intent_path || ''}:${params.destination_path || ''}`;
  const now = Date.now();
  if (signature === lastFunnelSignature && now - lastFunnelTrackedAt < FUNNEL_DEDUPE_MS) return;

  lastFunnelSignature = signature;
  lastFunnelTrackedAt = now;
  trackEvent(eventName, params);
}

function trackIntentCaptured(intent, authenticated) {
  const params = {
    intent_path: intent.path,
    intent_type: intent.kind,
    authentication_state: authenticated ? 'authenticated' : 'anonymous',
  };
  if (intent.kind === 'seller_post') {
    trackSellerFunnel('seller_post_intent', params);
  } else if (intent.kind === 'contact_message') {
    trackSellerFunnel('contact_auth_intent', params);
  } else {
    trackSellerFunnel('messages_auth_intent', params);
  }
}

function trackIntentReturned(intent) {
  const params = {
    intent_path: intent.path,
    intent_type: intent.kind,
    intent_age_ms: Math.max(0, Date.now() - intent.capturedAt),
    registration_flag_present: Boolean(localStorage.getItem(REGISTRATION_FLAG_KEY)),
  };
  if (intent.kind === 'seller_post') {
    trackSellerFunnel('seller_post_returned_after_auth', params);
  } else if (intent.kind === 'contact_message') {
    trackSellerFunnel('contact_returned_after_auth', params);
  } else {
    trackSellerFunnel('messages_returned_after_auth', params);
  }
}

function trackIntentAbandoned(intent, destinationPath) {
  const params = {
    intent_path: intent.path,
    intent_type: intent.kind,
    destination_path: destinationPath,
    intent_age_ms: Math.max(0, Date.now() - intent.capturedAt),
  };
  if (intent.kind === 'seller_post') {
    trackSellerFunnel('seller_post_intent_abandoned', params);
  } else if (intent.kind === 'contact_message') {
    trackSellerFunnel('contact_auth_intent_abandoned', params);
  } else {
    trackSellerFunnel('messages_auth_intent_abandoned', params);
  }
}

function clearIntent() {
  try {
    sessionStorage.removeItem(INTENT_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in privacy-restricted browsers.
  }
}

function writeIntent(destination, state) {
  const protectedDestination = protectedIntentFor(destination);
  if (!protectedDestination) return;

  const intent = {
    kind: protectedDestination.kind,
    path: protectedDestination.path,
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
  trackIntentCaptured(intent, authenticated);
  startAuthWatcher();
}

function readIntent() {
  try {
    const raw = sessionStorage.getItem(INTENT_STORAGE_KEY);
    if (!raw) return null;

    const intent = JSON.parse(raw);
    const destination = destinationFrom(intent?.path);
    const protectedDestination = protectedIntentFor(destination);
    if (!protectedDestination) {
      clearIntent();
      return null;
    }

    if (!Number.isFinite(intent?.capturedAt) || Date.now() - intent.capturedAt > INTENT_TTL_MS) {
      clearIntent();
      return null;
    }

    return {
      kind: protectedDestination.kind,
      path: protectedDestination.path,
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

    // Generic onboarding is useful for organic registrations, but it blocks
    // an explicit publish or contact conversion. Suppress only while a valid
    // protected journey intent is waiting to be restored.
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

function finishIntent(intent) {
  trackIntentReturned(intent);
  clearIntent();
  stopAuthWatcher();
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
    if (hasAuthenticatedSession) finishIntent(intent);
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
  finishIntent(intent);
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

  trackIntentAbandoned(intent, destinationPath);
  clearIntent();
  stopAuthWatcher();
}

function handleNavigation(url, state) {
  const destination = destinationFrom(url);
  if (!destination) return;

  if (protectedIntentFor(destination)) {
    writeIntent(destination, state);
    return;
  }

  // RequireAuth replaces protected routes with the plain home route while the
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

    if (protectedIntentFor(destination)) {
      writeIntent(destination, window.history.state);
    } else if (destination.path !== '/' && readIntent()) {
      abandonIntent(destination.path);
    }
  });

  const current = destinationFrom(null);
  if (protectedIntentFor(current)) {
    writeIntent(current, window.history.state);
  } else if (readIntent()) {
    startAuthWatcher();
  }
}
