const ENV = import.meta.env || {};
const ANALYTICS_ENABLED = ENV.VITE_ANALYTICS_ENABLED !== 'false';
const isBrowser = () => typeof window !== 'undefined';

export function isOpenAIAdsMeasurementAllowed() {
  if (!ANALYTICS_ENABLED || !isBrowser()) return false;

  try {
    return localStorage.getItem('cookie_consent') === 'all'
      && localStorage.getItem('mercasto_privacy_tracking_consent') !== 'false';
  } catch {
    return false;
  }
}
