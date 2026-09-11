const ENV = import.meta.env || {};
const ANALYTICS_ENABLED = ENV.VITE_ANALYTICS_ENABLED !== 'false';
const isBrowser = () => typeof window !== 'undefined';

export const COOKIE_CONSENT_KEY = 'cookie_consent';
export const COOKIE_CONSENT_ALL = 'all';
export const COOKIE_CONSENT_ESSENTIAL = 'essential';
// Fired by the cookie banner and the dashboard privacy switch whenever the
// visitor's choice changes (same tab).
export const TRACKING_CONSENT_EVENT = 'mercasto:tracking-consent';
// Fired by any "cookie settings" entry point to bring the consent UI back.
export const OPEN_COOKIE_PREFERENCES_EVENT = 'mercasto:open-cookie-preferences';
const ACCOUNT_TRACKING_CONSENT_KEY = 'mercasto_privacy_tracking_consent';
const CONSENT_RELEVANT_STORAGE_KEYS = new Set([
  COOKIE_CONSENT_KEY,
  ACCOUNT_TRACKING_CONSENT_KEY,
  'user',
  'auth_token',
]);

// Banner decision only: 'all' | 'essential' | null when the visitor never chose.
export function readCookieConsent() {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    return raw === COOKIE_CONSENT_ALL || raw === COOKIE_CONSENT_ESSENTIAL ? raw : null;
  } catch {
    return null;
  }
}

// Account-level withdrawal cached from the server flag. Returns true/false when
// the cached account states a preference and null when it is unknown.
function readAccountTrackingConsent() {
  if (!isBrowser()) return null;
  try {
    const cachedUser = JSON.parse(localStorage.getItem('user') || 'null');
    if (!cachedUser || typeof cachedUser !== 'object') return null;
    const rawPreferences = cachedUser.notification_preferences;
    const preferences = typeof rawPreferences === 'string'
      ? JSON.parse(rawPreferences || '{}')
      : (rawPreferences || {});
    const value = preferences?.analytics_tracking_consent;
    return typeof value === 'boolean' ? value : null;
  } catch {
    return null;
  }
}

// Vendor tracking consent state:
//   'granted' — analytics vendors may load and receive events
//   'denied'  — the visitor refused (or withdrew); nothing may be sent
//   'unknown' — the visitor has not decided yet; vendors must not load
export function getVendorConsentState() {
  if (!ANALYTICS_ENABLED || !isBrowser()) return 'denied';

  const decision = readCookieConsent();
  if (decision !== COOKIE_CONSENT_ALL) {
    return decision === COOKIE_CONSENT_ESSENTIAL ? 'denied' : 'unknown';
  }

  try {
    // The dashboard privacy switch and the server flag are authoritative when
    // they explicitly disable analytics measurement for the account.
    if (localStorage.getItem(ACCOUNT_TRACKING_CONSENT_KEY) === 'false') return 'denied';
    if (localStorage.getItem('auth_token') && readAccountTrackingConsent() === false) return 'denied';
  } catch {
    return 'denied';
  }

  return 'granted';
}

export function hasVendorConsent() {
  return getVendorConsentState() === 'granted';
}

// Subscribe to every consent signal that can happen while the page is open:
// banner clicks, dashboard switch, server sync and other-tab storage changes.
export function subscribeTrackingConsent(listener) {
  if (!isBrowser() || typeof listener !== 'function') return () => {};

  const notify = (event) => {
    if (event?.type === 'storage' && event.key && !CONSENT_RELEVANT_STORAGE_KEYS.has(event.key)) return;
    listener(getVendorConsentState());
  };

  window.addEventListener(TRACKING_CONSENT_EVENT, notify);
  window.addEventListener('storage', notify);
  window.addEventListener('mercasto:analytics-consent-synced', notify);

  return () => {
    window.removeEventListener(TRACKING_CONSENT_EVENT, notify);
    window.removeEventListener('storage', notify);
    window.removeEventListener('mercasto:analytics-consent-synced', notify);
  };
}

export function isOpenAIAdsMeasurementAllowed() {
  if (!ANALYTICS_ENABLED || !isBrowser()) return false;

  try {
    const cookieAllowed = localStorage.getItem('cookie_consent') === 'all';
    const localAllowed = localStorage.getItem('mercasto_privacy_tracking_consent') !== 'false';
    const hasAuth = Boolean(localStorage.getItem('auth_token'));
    let serverAllowed = true;
    if (hasAuth) {
      serverAllowed = false;
      try {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const rawPreferences = user?.notification_preferences;
        const preferences = typeof rawPreferences === 'string'
          ? JSON.parse(rawPreferences || '{}')
          : (rawPreferences || {});
        serverAllowed = preferences.analytics_tracking_consent === true;
      } catch {
        serverAllowed = false;
      }
    }
    return cookieAllowed && localAllowed && serverAllowed;
  } catch {
    return false;
  }
}


export async function persistAnalyticsTrackingConsent(allowed) {
  if (!isBrowser()) return false;
  let token;
  try { token = localStorage.getItem('auth_token'); } catch { return false; }
  if (!token) return false;

  try {
    const response = await fetch('/api/user/privacy/analytics-consent', {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ analytics_tracking_consent: Boolean(allowed) }),
    });
    if (!response.ok) return false;

    try {
      const cachedUser = JSON.parse(localStorage.getItem('user') || 'null');
      if (cachedUser && typeof cachedUser === 'object') {
        const rawPreferences = cachedUser.notification_preferences;
        const preferences = typeof rawPreferences === 'string'
          ? JSON.parse(rawPreferences || '{}')
          : (rawPreferences || {});
        cachedUser.notification_preferences = {
          ...preferences,
          analytics_tracking_consent: Boolean(allowed),
        };
        localStorage.setItem('user', JSON.stringify(cachedUser));
      }
    } catch {
      // Server state is authoritative; local cache synchronization is best effort.
    }
    window.dispatchEvent(new CustomEvent('mercasto:analytics-consent-synced', {
      detail: { allowed: Boolean(allowed) },
    }));
    return true;
  } catch {
    return false;
  }
}
