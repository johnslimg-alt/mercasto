import { isOpenAIAdsMeasurementAllowed } from './trackingConsent.js';

const ENV = import.meta.env || {};
const OPENAI_ADS_PIXEL_ID = ENV.VITE_OPENAI_ADS_PIXEL_ID || '';
const VERBOSE = ENV.VITE_ANALYTICS_VERBOSE === 'true';
const SDK_URL = 'https://bzrcdn.openai.com/sdk/oaiq.min.js';
const SENT = '__mercastoOpenAIAdsSent';

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

function oaiq() {
  return isBrowser() && typeof window.oaiq === 'function' ? window.oaiq : null;
}

function installQueue() {
  if (!isBrowser() || oaiq()) return;
  const q = function openAIAdsQueue() { q.q.push(arguments); };
  q.q = [];
  window.oaiq = q;

  const script = document.createElement('script');
  script.async = true;
  script.src = SDK_URL;
  const firstScript = document.getElementsByTagName('script')[0];
  if (firstScript?.parentNode) firstScript.parentNode.insertBefore(script, firstScript);
  else document.head.appendChild(script);
}

function initPixel() {
  if (!OPENAI_ADS_PIXEL_ID || !isBrowser() || window.__mercastoOpenAIAdsPixelInitialized) return;
  if (!isOpenAIAdsMeasurementAllowed()) return;
  installQueue();
  const queue = oaiq();
  if (!queue) return;
  queue('consent', true);
  queue('init', { pixelId: OPENAI_ADS_PIXEL_ID, ...(VERBOSE ? { debug: true } : {}) });
  window.__mercastoOpenAIAdsPixelInitialized = true;
}

function syncConsent() {
  const allowed = isOpenAIAdsMeasurementAllowed();
  if (allowed) initPixel();
  const queue = oaiq();
  if (queue && window.__mercastoOpenAIAdsPixelInitialized) queue('consent', allowed);
}

const clean = (value, max = 160) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

function listingContent(item = {}) {
  const rawId = clean(item.listing_id || item.ad_id || item.content_id);
  if (!rawId) return null;
  return {
    id: rawId.startsWith('ad_') ? rawId : `ad_${rawId}`,
    name: clean(item.content_name || item.item_name || 'Mercasto classified listing'),
    content_type: 'classified_listing',
  };
}

function pageContent(item = {}) {
  const id = clean(item.route_group || item.page_path || 'page');
  return {
    id: id || 'page',
    name: clean(item.page_title || id || 'Mercasto page'),
    content_type: 'page',
  };
}

function options(item = {}, customEventName = '') {
  const eventId = clean(item.event_id || item.meta_event_id, 120);
  return {
    ...(eventId ? { event_id: eventId } : {}),
    ...(customEventName ? { custom_event_name: customEventName } : {}),
  };
}

function measure(name, data, eventOptions = {}) {
  if (!isOpenAIAdsMeasurementAllowed()) return false;
  initPixel();
  const queue = oaiq();
  if (!queue) return false;
  queue('measure', name, data, eventOptions);
  return true;
}

function handleItem(item = {}) {
  if (!item || typeof item !== 'object' || item[SENT] || !isOpenAIAdsMeasurementAllowed()) return;
  const event = clean(item.event).toLowerCase();
  let sent = false;

  if (event === 'page_view') {
    sent = measure('page_viewed', { type: 'contents', contents: [pageContent(item)] }, options(item));
  } else if (event === 'listing_viewed' || event === 'ad_viewed') {
    const content = listingContent(item);
    if (content) sent = measure('contents_viewed', { type: 'contents', contents: [content] }, options(item));
  } else if (event === 'sign_up') {
    sent = measure('registration_completed', { type: 'customer_action' }, options(item));
  } else if (event === 'listing_published' || event === 'ad_posted') {
    const content = listingContent(item);
    sent = measure('custom', { type: 'custom', ...(content ? { contents: [content] } : {}) },
      options(item, 'listing_published'));
  } else if (event === 'lead_created') {
    sent = measure('lead_created', { type: 'customer_action' }, options(item));
  }

  if (sent) {
    try { item[SENT] = true; } catch { /* analytics item may be immutable */ }
  }
}

export function installOpenAIAdsBridge() {
  if (!isBrowser() || window.__mercastoOpenAIAdsBridgeInstalled) return;
  window.__mercastoOpenAIAdsBridgeInstalled = true;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.forEach(handleItem);

  const previousPush = window.dataLayer.push.bind(window.dataLayer);
  window.dataLayer.push = (...items) => {
    const result = previousPush(...items);
    items.forEach(handleItem);
    return result;
  };

  window.addEventListener('mercasto:tracking-consent', syncConsent);
  window.addEventListener('storage', (storageEvent) => {
    if (storageEvent.key === 'cookie_consent'
      || storageEvent.key === 'mercasto_privacy_tracking_consent') {
      syncConsent();
    }
  });
}
