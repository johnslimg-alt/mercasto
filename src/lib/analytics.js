const ANALYTICS_DEBUG = import.meta.env.VITE_ANALYTICS_DEBUG === 'true';

const SAFE_PROPERTY_ALLOWLIST = new Set([
  'action',
  'account_type',
  'badge_type',
  'category',
  'channel',
  'city',
  'contact_type',
  'device',
  'field',
  'filter_type',
  'has_media',
  'language',
  'listing_id',
  'page',
  'placement',
  'provider_id',
  'reason',
  'seller_id',
  'source',
  'state',
  'status',
  'to_status',
  'from_status',
  'vertical',
]);

function sanitizeProperties(properties = {}) {
  return Object.entries(properties).reduce((safe, [key, value]) => {
    if (!SAFE_PROPERTY_ALLOWLIST.has(key)) return safe;
    if (value === undefined || value === null) return safe;

    if (typeof value === 'string') {
      safe[key] = value.slice(0, 120);
      return safe;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      safe[key] = value;
      return safe;
    }

    return safe;
  }, {});
}

export function trackEvent(eventName, properties = {}) {
  if (!eventName || typeof eventName !== 'string') return;

  const payload = {
    event: eventName,
    properties: sanitizeProperties(properties),
    timestamp: new Date().toISOString(),
  };

  if (ANALYTICS_DEBUG) {
    console.info('[analytics]', payload);
  }

  if (typeof window === 'undefined') return;

  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, payload.properties);
  }

  if (typeof window.plausible === 'function') {
    window.plausible(eventName, { props: payload.properties });
  }
}

export function trackPageView(path = window.location?.pathname || '/') {
  trackEvent('page_viewed', { page: path });
}

export function createAnalyticsContext(baseProperties = {}) {
  const safeBase = sanitizeProperties(baseProperties);

  return {
    track(eventName, properties = {}) {
      trackEvent(eventName, { ...safeBase, ...properties });
    },
  };
}
