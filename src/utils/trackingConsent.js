const ENV = import.meta.env || {};
const ANALYTICS_ENABLED = ENV.VITE_ANALYTICS_ENABLED !== 'false';
const isBrowser = () => typeof window !== 'undefined';

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
