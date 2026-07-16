const TIKTOK_PIXEL_ID = 'D9C3HKBC77UBS5FSD7C0';

const TIKTOK_EVENT_MAP = {
  ad_viewed: 'ViewContent',
  view_item: 'ViewContent',
  select_content: 'ViewContent',

  search: 'Search',
  view_search_results: 'Search',

  favorite_added: 'AddToWishlist',
  add_to_wishlist: 'AddToWishlist',

  begin_checkout: 'InitiateCheckout',
  initiate_checkout: 'InitiateCheckout',
  checkout_started: 'InitiateCheckout',

  find_location: 'FindLocation',
  location_search: 'FindLocation',
  location_selected: 'FindLocation',

  ui_click: 'ClickButton',
  link_click: 'ClickButton',
  form_submit_click: 'ClickButton',
  form_submit: 'ClickButton',
  ad_card_click: 'ClickButton',

  contact_click: 'Contact',
  whatsapp_click: 'Contact',
  telegram_click: 'Contact',
  phone_click: 'Contact',
  email_click: 'Contact',
  message_started: 'Contact',

  add_payment_info: 'AddPaymentInfo',
  payment_info_added: 'AddPaymentInfo',

  download: 'Download',
  file_download: 'Download',

  // Purchase is server-only after Clip confirms the payment. This prevents an
  // optimistic browser event from counting an abandoned or failed checkout.

  lead: 'Lead',
  offer_made: 'Lead',
  ad_posted: 'Lead',
  listing_published: 'Lead',
  phone_verified: 'Lead',

  application_approval: 'ApplicationApproval',
  application_approved: 'ApplicationApproval',

  sign_up: 'CompleteRegistration',
  complete_registration: 'CompleteRegistration',

  customize_product: 'CustomizeProduct',
  product_customized: 'CustomizeProduct',

  subscribe: 'Subscribe',
  subscription_started: 'Subscribe',

  submit_application: 'SubmitApplication',
  application_submitted: 'SubmitApplication',

  start_trial: 'StartTrial',
  trial_started: 'StartTrial',

  place_an_order: 'PlaceAnOrder',
  order_placed: 'PlaceAnOrder',
};

const AUTH_ENDPOINTS = new Set([
  '/api/user',
  '/api/login',
  '/api/register',
  '/api/two-factor/verify',
]);

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function cleanString(value, maxLength = 200) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function compactObject(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => (
      value !== undefined && value !== null && value !== ''
    )),
  );
}

async function sha256(value) {
  if (!isBrowser() || !window.crypto?.subtle || !value) return '';
  const bytes = new TextEncoder().encode(String(value));
  const digest = await window.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function normalizeEmail(email) {
  return cleanString(email, 320).toLowerCase();
}

function normalizePhone(phone) {
  const raw = cleanString(phone, 80);
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return raw.startsWith('+') ? `+${digits}` : digits;
}

function normalizeExternalId(externalId) {
  return cleanString(externalId, 200).toLowerCase();
}

export async function identifyTikTokUser(user = {}) {
  if (!isBrowser() || typeof window.ttq?.identify !== 'function') return;

  const email = normalizeEmail(user.email);
  const phone = normalizePhone(user.phone_number || user.phone || user.telephone);
  const externalId = normalizeExternalId(user.external_id || user.id || user.user_id);

  const [hashedEmail, hashedPhone, hashedExternalId] = await Promise.all([
    sha256(email),
    sha256(phone),
    sha256(externalId),
  ]);

  const identity = compactObject({
    email: hashedEmail,
    phone_number: hashedPhone,
    external_id: hashedExternalId,
  });

  if (!Object.keys(identity).length) return;

  const signature = JSON.stringify(identity);
  if (window.__mercastoTikTokIdentitySignature === signature) return;
  window.__mercastoTikTokIdentitySignature = signature;
  window.ttq.identify(identity);
}

function normalizeContent(eventName, data, source = {}) {
  const contentId = cleanString(
    source.content_id
      || source.item_id
      || data.content_id
      || data.ad_id
      || data.store_id
      || data.element_id
      || data.page_path,
    180,
  );
  const contentName = cleanString(
    source.content_name
      || source.item_name
      || data.content_name
      || data.item_name
      || data.element_text
      || data.page_title,
    200,
  );
  const contentCategory = cleanString(
    source.content_category
      || source.item_category
      || data.content_category
      || data.category
      || data.item_category
      || data.route_group,
    120,
  );
  const price = positiveNumber(
    source.price
      ?? source.item_price
      ?? source.unit_price
      ?? data.price
      ?? data.item_price
      ?? data.unit_price,
  );
  const numItems = positiveNumber(
    source.num_items
      ?? source.quantity
      ?? data.num_items
      ?? data.quantity,
  );
  const brand = cleanString(source.brand || source.item_brand || data.brand || data.item_brand, 120);

  return compactObject({
    content_id: contentId,
    content_type: source.content_type === 'product_group'
      || data.content_type === 'product_group'
      || eventName === 'Search'
      ? 'product_group'
      : 'product',
    content_name: contentName,
    content_category: contentCategory,
    price,
    num_items: numItems,
    brand,
  });
}

function buildContents(eventName, data) {
  const suppliedContents = Array.isArray(data.contents) && data.contents.length
    ? data.contents
    : Array.isArray(data.items) && data.items.length
      ? data.items
      : [data];

  const contents = suppliedContents
    .slice(0, 10)
    .map((source) => normalizeContent(eventName, data, source))
    .filter((content) => Object.keys(content).length > 1);

  return contents.length ? contents : undefined;
}

async function createEventId(data) {
  const seed = cleanString(data.event_id, 240)
    || `${Date.now()}_${window.crypto?.randomUUID?.() || Math.random().toString(16).slice(2)}`;
  return sha256(seed);
}

async function trackTikTokEvent(eventName, data = {}) {
  if (!isBrowser() || typeof window.ttq?.track !== 'function') return;

  const value = positiveNumber(data.value ?? data.event_value ?? data.price);
  const description = cleanString(data.content_description || data.public_description, 240);
  const payload = compactObject({
    contents: buildContents(eventName, data),
    value,
    currency: cleanString(data.currency || 'MXN', 8).toUpperCase(),
    search_string: cleanString(data.search_string || data.search_term, 200),
    // Browser IP is already available to TikTok from the request. Never place raw PII in description.
    description: description && description !== '[redacted]' ? description : undefined,
    status: cleanString(data.status, 80),
  });

  const eventId = await createEventId(data);
  window.ttq.track(eventName, payload, eventId ? { event_id: eventId } : undefined);
}

function handleDataLayerItem(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return;
  const analyticsEvent = cleanString(item.event, 80).toLowerCase();
  if (!analyticsEvent) return;

  if (analyticsEvent === 'page_view') {
    const pageKey = cleanString(
      item.page_path || `${window.location.pathname}${window.location.search}${window.location.hash}`,
      500,
    );
    if (pageKey && pageKey !== window.__mercastoTikTokLastPageKey) {
      window.__mercastoTikTokLastPageKey = pageKey;
      window.ttq.page();
    }
    return;
  }

  const tikTokEvent = TIKTOK_EVENT_MAP[analyticsEvent];
  if (!tikTokEvent) return;
  trackTikTokEvent(tikTokEvent, item).catch(() => {});
}

function installDataLayerBridge() {
  if (!isBrowser() || window.__mercastoTikTokDataLayerBridgeInstalled) return;
  window.__mercastoTikTokDataLayerBridgeInstalled = true;
  window.dataLayer = window.dataLayer || [];

  const dataLayer = window.dataLayer;
  const originalPush = dataLayer.push.bind(dataLayer);
  dataLayer.push = function patchedTikTokDataLayerPush(...items) {
    const result = originalPush(...items);
    items.forEach(handleDataLayerItem);
    return result;
  };

  dataLayer.forEach(handleDataLayerItem);
}

function extractRequestPath(input) {
  try {
    const rawUrl = typeof input === 'string' || input instanceof URL
      ? String(input)
      : input?.url;
    return new URL(rawUrl, window.location.origin).pathname;
  } catch {
    return '';
  }
}

function installAuthIdentityBridge() {
  if (!isBrowser() || window.__mercastoTikTokAuthBridgeInstalled) return;
  window.__mercastoTikTokAuthBridgeInstalled = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async function patchedTikTokIdentityFetch(input, init) {
    const response = await originalFetch(input, init);
    const path = extractRequestPath(input);

    if (response.ok && AUTH_ENDPOINTS.has(path)) {
      response.clone().json()
        .then((data) => identifyTikTokUser(data?.user || data))
        .catch(() => {});
    }

    return response;
  };
}

export function initTikTokPixel() {
  if (!isBrowser()) return;
  if (window.__mercastoTikTokPixelLoaded) return;

  window.__mercastoTikTokPixelLoaded = true;

  /* eslint-disable */
  !function (w, d, t) {
    w.TiktokAnalyticsObject = t;
    var ttq = w[t] = w[t] || [];
    ttq.methods = [
      'page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once',
      'ready', 'alias', 'group', 'enableCookie', 'disableCookie', 'holdConsent',
      'revokeConsent', 'grantConsent'
    ];
    ttq.setAndDefer = function (target, method) {
      target[method] = function () {
        target.push([method].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };
    for (var i = 0; i < ttq.methods.length; i++) {
      ttq.setAndDefer(ttq, ttq.methods[i]);
    }
    ttq.instance = function (pixelId) {
      var instance = ttq._i[pixelId] || [];
      for (var j = 0; j < ttq.methods.length; j++) {
        ttq.setAndDefer(instance, ttq.methods[j]);
      }
      return instance;
    };
    ttq.load = function (pixelId, options) {
      var url = 'https://analytics.tiktok.com/i18n/pixel/events.js';
      var partner = options && options.partner;
      ttq._i = ttq._i || {};
      ttq._i[pixelId] = [];
      ttq._i[pixelId]._u = url;
      ttq._t = ttq._t || {};
      ttq._t[pixelId] = +new Date();
      ttq._o = ttq._o || {};
      ttq._o[pixelId] = options || {};
      var script = d.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = url + '?sdkid=' + pixelId + '&lib=' + t;
      var firstScript = d.getElementsByTagName('script')[0];
      firstScript.parentNode.insertBefore(script, firstScript);
      return partner;
    };
  }(window, document, 'ttq');
  /* eslint-enable */

  window.ttq.load(TIKTOK_PIXEL_ID);
  window.__mercastoTikTokLastPageKey = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.ttq.page();
  installDataLayerBridge();
  installAuthIdentityBridge();
}
