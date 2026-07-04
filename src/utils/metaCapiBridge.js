const META_API_BASE = '/api/meta/events';

const EVENT_MAP = {
  ad_posted: { endpoint: 'post-ad', metaName: 'PostAd', custom: true },
  listing_published: { endpoint: 'post-ad', metaName: 'PostAd', custom: true },
  favorite_added: { endpoint: 'wishlist', metaName: 'AddToWishlist' },
  add_to_wishlist: { endpoint: 'wishlist', metaName: 'AddToWishlist' },
  contact_click: { endpoint: 'contact', metaName: 'Contact' },
  whatsapp_click: { endpoint: 'contact', metaName: 'Contact', method: 'whatsapp' },
  telegram_click: { endpoint: 'contact', metaName: 'Contact', method: 'telegram' },
  phone_click: { endpoint: 'contact', metaName: 'Contact', method: 'phone' },
  email_click: { endpoint: 'contact', metaName: 'Contact', method: 'email' },
  message_started: { endpoint: 'contact', metaName: 'Contact', method: 'message' },
  sign_up: { endpoint: 'register', metaName: 'CompleteRegistration' },
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

function safeHref(href = '') {
  if (!href || !isBrowser()) return '';
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin === window.location.origin) return `${url.pathname}${url.search}`;
    if (url.protocol === 'tg:') return 'tg:';
    return url.hostname;
  } catch {
    return clean(href);
  }
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
    user_id: clean(dataLayerItem.user_id || ''),
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
      keepalive: true,
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

  const isReg = metaConfig.metaName === 'CompleteRegistration';
  const params = isReg ? {} : {
    content_type: 'classified_ad',
    listing_id: payload.listing_id,
    category: payload.category,
    city: payload.city,
    currency: 'MXN',
    value: 0,
  };

  if (!isReg && payload.method) params.contact_method = payload.method;

  if (metaConfig.custom) {
    window.fbq('trackCustom', metaConfig.metaName, params, { eventID });
  } else {
    window.fbq('track', metaConfig.metaName, params, { eventID });
  }
}

function sendMappedEvent(metaConfig, item = {}) {
  const payload = buildPayload(item);
  const isReg = metaConfig.metaName === 'CompleteRegistration';
  const isPostAd = metaConfig.metaName === 'PostAd';
  
  if (!isReg && !isPostAd && !payload.listing_id) return;

  const id = eventId(metaConfig.endpoint, payload.listing_id || 'user');
  const method = clean(item.method || item.contact_method || metaConfig.method || '');
  const serverPayload = {
    event_id: id,
    ...payload,
    ...(method ? { method } : {}),
  };

  sendBrowserEvent(metaConfig, serverPayload, id);
  void sendServerEvent(metaConfig.endpoint, serverPayload);
}

function handleDataLayerItem(item = {}) {
  if (!item || typeof item !== 'object') return;
  const normalizedEvent = String(item.event || '').trim().toLowerCase();
  const metaConfig = EVENT_MAP[normalizedEvent];
  if (!metaConfig) return;
  sendMappedEvent(metaConfig, item);
}

function isTelegramTarget(el) {
  const href = clean(el.getAttribute('href') || '').toLowerCase();
  const text = clean(el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').toLowerCase();

  return href.startsWith('tg:')
    || href.includes('t.me/')
    || href.includes('telegram.me/')
    || href.includes('telegram.dog/')
    || href.includes('web.telegram.org')
    || text.includes('telegram');
}

function nearestListingId(el) {
  const adNode = el.closest('[data-ad-id], [data-listing-id], [data-content-id]');
  return clean(
    adNode?.getAttribute('data-ad-id')
    || adNode?.getAttribute('data-listing-id')
    || adNode?.getAttribute('data-content-id')
    || el.getAttribute('data-ad-id')
    || el.getAttribute('data-listing-id')
    || el.getAttribute('data-content-id')
    || ''
  );
}

function markTelegramClickForSharedAnalytics(event) {
  if (!(event.target instanceof Element)) return;
  const el = event.target.closest('a, button, [role="button"], [data-telegram], [data-analytics-event="telegram_click"]');
  if (!el || !isTelegramTarget(el)) return;

  el.setAttribute('data-analytics-event', 'telegram_click');
  el.setAttribute('data-analytics-label', 'telegram');
  el.setAttribute('data-contact-method', 'telegram');

  const listingId = nearestListingId(el);
  if (listingId && !el.getAttribute('data-ad-id')) {
    el.setAttribute('data-ad-id', listingId);
  }

  const hrefPath = safeHref(el.getAttribute('href') || '');
  if (hrefPath && !el.getAttribute('data-safe-href')) {
    el.setAttribute('data-safe-href', hrefPath);
  }
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

  document.addEventListener('click', markTelegramClickForSharedAnalytics, true);
}
