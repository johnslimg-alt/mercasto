const META_API_BASE = '/api/meta/events';

const EVENT_MAP = {
  ad_posted: { endpoint: 'post-ad', metaName: 'PostAd', custom: true },
  listing_published: { endpoint: 'post-ad', metaName: 'PostAd', custom: true },
  favorite_added: { endpoint: 'wishlist', metaName: 'AddToWishlist' },
  add_to_wishlist: { endpoint: 'wishlist', metaName: 'AddToWishlist' },
  contact_click: { endpoint: 'contact', metaName: 'Contact' },
  whatsapp_click: { endpoint: 'contact', metaName: 'Contact', method: 'whatsapp' },
  phone_click: { endpoint: 'contact', metaName: 'Contact', method: 'phone' },
  email_click: { endpoint: 'contact', metaName: 'Contact', method: 'email' },
  message_started: { endpoint: 'contact', metaName: 'Contact', method: 'message' },
};

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function randomId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function eventId(prefix, listingId = '') {
  return `${prefix}_${listingId || 'event'}_${randomId()}`;
}

function clean(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, 140);
}

function extractListingId(payload = {}) {
  return clean(payload.listing_id || payload.ad_id || payload.content_id || payload.item_id || '');
}

function buildPayload(dataLayerItem = {}) {
  const listingId = extractListingId(dataLayerItem);
  return {
    listing_id: listingId,
    category: clean(dataLayerItem.category || dataLayerItem.content_category || ''),
    city: clean(dataLayerItem.city || dataLayerItem.location_city || ''),
    url: clean(dataLayerItem.page_location || window.location.href),
  };
}

async function sendServerEvent(endpoint, payload) {
  try {
    if (window.axios) {
      await window.axios.post(`${META_API_BASE}/${endpoint}`, payload);
      return true;
    }

    const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    await fetch(`${META_API_BASE}/${endpoint}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
      },
      body: JSON.stringify(payload),
    });
    return true;
  } catch (error) {
    if (import.meta.env.VITE_ANALYTICS_VERBOSE === 'true') {
      console.warn('[Mercasto Meta CAPI] server event failed', endpoint, error);
    }
    return false;
  }
}

function sendBrowserEvent(metaConfig, payload, eventID) {
  if (typeof window.fbq !== 'function') return;

  const params = {
    content_type: 'classified_ad',
    listing_id: payload.listing_id,
    category: payload.category,
    city: payload.city,
    currency: 'MXN',
    value: 0,
  };

  if (payload.method) params.contact_method = payload.method;

  if (metaConfig.custom) {
    window.fbq('trackCustom', metaConfig.metaName, params, { eventID });
  } else {
    window.fbq('track', metaConfig.metaName, params, { eventID });
  }
}

function handleDataLayerItem(item = {}) {
  if (!item || typeof item !== 'object') return;
  const normalizedEvent = String(item.event || '').trim().toLowerCase();
  const metaConfig = EVENT_MAP[normalizedEvent];
  if (!metaConfig) return;

  const payload = buildPayload(item);
  if (!payload.listing_id) return;

  const id = eventId(metaConfig.endpoint, payload.listing_id);
  const method = clean(item.method || item.contact_method || metaConfig.method || '');
  const serverPayload = {
    event_id: id,
    ...payload,
    ...(method ? { method } : {}),
  };

  sendBrowserEvent(metaConfig, serverPayload, id);
  void sendServerEvent(metaConfig.endpoint, serverPayload);
}

export function installMetaCapiBridge() {
  if (!isBrowser() || window.__mercastoMetaCapiBridgeInstalled) return;
  window.__mercastoMetaCapiBridgeInstalled = true;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.forEach(handleDataLayerItem);

  const originalPush = window.dataLayer.push.bind(window.dataLayer);
  window.dataLayer.push = (...items) => {
    const result = originalPush(...items);
    items.forEach(handleDataLayerItem);
    return result;
  };
}
