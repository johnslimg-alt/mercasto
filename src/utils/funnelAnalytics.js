export const FUNNEL_ANALYTICS_VERSION = '2026-08-04';

export const FUNNEL_EVENTS = Object.freeze({
  SIGN_UP_ATTEMPT: 'sign_up_attempt',
  SIGN_UP: 'sign_up',
  SIGN_UP_FAILED: 'sign_up_failed',
  LISTING_PUBLISH_ATTEMPT: 'listing_publish_attempt',
  LISTING_PUBLISHED: 'listing_published',
  LISTING_PUBLISH_FAILED: 'listing_publish_failed',
  LISTING_UPDATED: 'listing_updated',
  LISTING_VIEWED: 'listing_viewed',
  SEARCH: 'search',
  FAVORITE_ADDED: 'favorite_added',
  CONTACT_CTA_VIEWED: 'contact_cta_viewed',
  CONTACT_ATTEMPT: 'contact_attempt',
  CONTACT_OPENED: 'contact_opened',
  CONTACT_FAILED: 'contact_failed',
  MESSAGE_STARTED: 'message_started',
  MESSAGE_SENT: 'message_sent',
  PURCHASE: 'purchase',
});

export function createAnalyticsEventId(prefix = 'event') {
  const safePrefix = String(prefix || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32) || 'event';
  const random = globalThis.crypto?.randomUUID?.()
    || `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return `${safePrefix}_${random}`.slice(0, 120);
}

export function registrationEventId() {
  return createAnalyticsEventId('register_user');
}

export function listingAnalyticsParams(listingId, category, params = {}) {
  const normalizedId = listingId === null || listingId === undefined
    ? ''
    : String(listingId).trim();
  return {
    content_type: 'classified_ad',
    ...(normalizedId ? {
      listing_id: normalizedId,
      ad_id: normalizedId,
      content_id: `ad_${normalizedId}`,
    } : {}),
    ...(category ? { category: String(category).trim() } : {}),
    ...params,
  };
}
