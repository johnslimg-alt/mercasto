import { FUNNEL_ANALYTICS_VERSION, FUNNEL_EVENTS, listingAnalyticsParams } from './funnelAnalytics.js';
import { getVendorConsentState, hasVendorConsent } from './trackingConsent.js';

// Cross-platform analytics layer for GA4, Meta Pixel, Microsoft/Bing UET and Clarity.
// It intentionally does not capture raw email, phone, password, message or textarea values.
//
// Privacy contract: no vendor script is fetched and no vendor receives an event
// until the visitor grants analytics consent through the cookie banner
// (localStorage.cookie_consent === 'all'). See activateAnalyticsVendors(),
// revokeAnalyticsVendors() and src/utils/trackingConsent.js.

const ENV = import.meta.env || {};
const ANALYTICS_ENABLED = ENV.VITE_ANALYTICS_ENABLED !== 'false';
const META_PIXEL_ID = ENV.VITE_META_PIXEL_ID || '';
const MICROSOFT_UET_TAG_ID = ENV.VITE_MICROSOFT_UET_TAG_ID || '';
const CLARITY_PROJECT_ID = ENV.VITE_CLARITY_PROJECT_ID || '';
const ANALYTICS_VERBOSE = ENV.VITE_ANALYTICS_VERBOSE === 'true';
const GA4_SCRIPT_SRC = 'https://www.googletagmanager.com/gtag/js';

// Cookies set by the tracking vendors themselves on our origin. Withdrawal
// removes them so an already loaded vendor cannot keep resolving the visitor
// through a stored identifier.
const VENDOR_COOKIE_PATTERNS = [
  /^_ga($|_)/,
  /^_gid$/,
  /^_gcl/,
  /^_gac_/,
  /^_fb[pc]$/,
  /^_tt/,
  /^_uet/,
  /^_clck$/,
  /^_clsk$/,
  /^(MR|MUID|SM|SRM_B|ANONCHK|CLID)$/i,
];

const DENIED_CONSENT_STATE = {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
};

const GRANTED_CONSENT_STATE = {
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted',
  analytics_storage: 'granted',
};


const MAX_PARAM_LENGTH = 140;
const MAX_PENDING_VENDOR_EVENTS = 100;
const SCROLL_THRESHOLDS = [25, 50, 75, 90, 100];
const CLICK_SELECTOR = [
  'a',
  'button',
  '[role="button"]',
  'input',
  'select',
  'textarea',
  'label',
  'summary',
  '[data-analytics-event]',
  '[data-ad-id]',
].join(',');

const PII_KEY_PATTERN = /(email|e_mail|phone|telefono|teléfono|password|pass|token|secret|address|direccion|dirección|whatsapp|telegram|message|mensaje|comment|comentario|description|descripcion|descripción|code|codigo|código|otp|sms|latitude|longitude|lat|lng)/i;

const META_STANDARD_EVENT_MAP = {
  page_view: 'PageView',
  search: 'Search',
  view_search_results: 'Search',
  listing_viewed: 'ViewContent',
  ad_viewed: 'ViewContent',
  view_item: 'ViewContent',
  select_content: 'ViewContent',
  favorite_added: 'AddToWishlist',
  add_to_wishlist: 'AddToWishlist',
  contact_opened: 'Contact',
  contact_click: 'Contact',
  whatsapp_click: 'Contact',
  phone_click: 'Contact',
  email_click: 'Contact',
  message_started: 'Contact',
  lead: 'Lead',
  offer_made: 'Lead',
  ad_posted: 'Lead',
  listing_published: 'Lead',
  sign_up: 'CompleteRegistration',
  phone_verified: 'CompleteRegistration',
  purchase: 'Purchase',
};

let vendorsReady = false;
let vendorActivationAllowed = false;
let pendingVendorEvents = [];
let preConsentPageViewDropped = false;
let behaviorReady = false;
let lastUrl = '';
let pageStartedAt = Date.now();
let currentPageContext = {};
let maxScrollPercent = 0;
let scrollThresholdsHit = new Set();
let scrollTicking = false;
let heartbeatTimer = null;
let mutationObserver = null;
let domMutationCount = 0;
let adObserver = null;
let observedAdNodes = new WeakSet();
let seenAdImpressions = new Set();
let recentClicks = [];
let fieldFocusStartedAt = new WeakMap();
let longTaskEventsSent = 0;
let latestLcpMs = 0;
let cumulativeLayoutShift = 0;
let firstInputDelayMs = null;

const getGtag = () => (
  typeof window !== 'undefined' && typeof window.gtag === 'function' ? window.gtag : null
);

const getFbq = () => (
  typeof window !== 'undefined' && typeof window.fbq === 'function' ? window.fbq : null
);

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';
const isEnabled = () => ANALYTICS_ENABLED && isBrowser();

function normalizeEventName(eventName) {
  return String(eventName || 'custom_event')
    .trim()
    .replace(/[^a-zA-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
    .slice(0, 64) || 'custom_event';
}

function normalizeParamKey(key) {
  return String(key || 'param')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
    .slice(0, 40) || 'param';
}

function cleanString(value, maxLength = MAX_PARAM_LENGTH) {
  return String(value)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function sanitizeValue(key, value) {
  if (value === undefined || value === null) return undefined;

  if (PII_KEY_PATTERN.test(key)) {
    if (typeof value === 'boolean' || typeof value === 'number') return value;
    return '[redacted]';
  }

  if (typeof value === 'string') return cleanString(value);
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value
      .slice(0, 10)
      .map((item) => (typeof item === 'object' && item !== null ? sanitizeParams(item) : sanitizeValue(key, item)))
      .filter((item) => item !== undefined);
  }

  if (typeof value === 'object') return sanitizeParams(value);
  return cleanString(value);
}

function sanitizeParams(params = {}) {
  const out = {};
  Object.entries(params || {}).forEach(([rawKey, rawValue]) => {
    const key = normalizeParamKey(rawKey);
    const value = sanitizeValue(key, rawValue);
    if (value !== undefined && value !== '') out[key] = value;
  });
  return out;
}

const SESSION_ID_KEY = 'mercasto_analytics_session_id';

// Session correlation id. Before a consent grant it exists in memory only, so
// the pre-consent window writes no identifier to the browser; once consent is
// granted the same value is persisted, so the session keeps its continuity.
let memorySessionId = '';

function createSessionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getSessionId() {
  if (!isBrowser()) return '';
  if (!memorySessionId) memorySessionId = createSessionId();

  if (!hasVendorConsent()) return memorySessionId;

  try {
    const stored = sessionStorage.getItem(SESSION_ID_KEY);
    if (stored) {
      memorySessionId = stored;
      return stored;
    }
    sessionStorage.setItem(SESSION_ID_KEY, memorySessionId);
  } catch {
    // Restricted browsers keep the in-memory id.
  }
  return memorySessionId;
}

function inferRouteGroup(pathname) {
  if (!pathname || pathname === '/') return 'home';
  if (/^\/(ads|anuncio)\/[^/]+/.test(pathname)) return '/ads/:id';
  if (/^\/(vendedor|store|tienda)\/[^/]+/.test(pathname)) return '/seller/:id';
  return `/${pathname.split('/').filter(Boolean)[0]}`;
}

function inferCategoryFromPath(pathname, params) {
  const directCategory = params.get('category') || params.get('cat');
  if (directCategory) return directCategory;

  const first = pathname.split('/').filter(Boolean)[0];
  const pathCategories = {
    autos: 'motor',
    coches: 'motor',
    motor: 'motor',
    inmuebles: 'inmobiliaria',
    inmobiliaria: 'inmobiliaria',
    servicios: 'servicios',
    empleos: 'empleo',
    empleo: 'empleo',
    tiendas: 'tiendas',
  };
  return pathCategories[first] || '';
}

function getPageContext() {
  if (!isBrowser()) return {};

  const url = new URL(window.location.href);
  const params = url.searchParams;
  const hashAdMatch = url.hash.match(/^#ad-([^&]+)/);
  const hashStoreMatch = url.hash.match(/^#company-([^&]+)/);
  const pathAdMatch = url.pathname.match(/^\/(?:ads|anuncio)\/([^/]+)/);

  return sanitizeParams({
    page_path: `${url.pathname}${url.search}${url.hash || ''}`,
    page_title: document.title,
    page_location: `${url.origin}${url.pathname}${url.search}`,
    route_group: inferRouteGroup(url.pathname),
    category: inferCategoryFromPath(url.pathname, params),
    ad_id: params.get('ad') || (hashAdMatch ? hashAdMatch[1] : '') || (pathAdMatch ? pathAdMatch[1] : ''),
    store_id: params.get('store') || (hashStoreMatch ? hashStoreMatch[1] : ''),
    search_active: Boolean(params.get('search') || params.get('q')),
    language: document.documentElement.lang || navigator.language || '',
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
  });
}

function initMetaPixel() {
  if (!isBrowser() || !META_PIXEL_ID || window.__mercastoMetaPixelLoaded) return;
  window.__mercastoMetaPixelLoaded = true;

  /* eslint-disable */
  !function(f,b,e,v,n,t,s){
    if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)
  }(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  // Meta's consent API only sends data after an explicit grant. Grant here
  // (the caller already verified consent) so a later withdrawal can revoke.
  syncVendorConsent(true);

  window.fbq('init', META_PIXEL_ID);
}

function initMicrosoftUet() {
  if (!isBrowser() || !MICROSOFT_UET_TAG_ID || window.__mercastoUetLoaded) return;
  window.__mercastoUetLoaded = true;

  window.uetq = window.uetq || [];
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://bat.bing.com/bat.js';
  script.onload = () => {
    if (typeof window.UET !== 'function') return;
    const uet = new window.UET({ ti: MICROSOFT_UET_TAG_ID, enableAutoSpaTracking: true, q: window.uetq });
    window.uetq = uet;
    window.uetq.push('pageLoad');
  };
  document.head.appendChild(script);
}

function initClarity() {
  if (!isBrowser() || !CLARITY_PROJECT_ID || window.__mercastoClarityLoaded) return;
  window.__mercastoClarityLoaded = true;

  /* eslint-disable */
  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window, document, 'clarity', 'script', CLARITY_PROJECT_ID);
  /* eslint-enable */
}

// Fetches the GA4 library. The index.html snippet only queues the local
// dataLayer commands, so this is the single place that contacts Google.
export function loadGa4() {
  if (!isEnabled() || !hasVendorConsent()) return false;
  if (window.__mercastoGaLoaded) return true;

  const measurementId = window.__mercastoGaMeasurementId;
  if (!measurementId) return false;

  window.__mercastoGaLoaded = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `${GA4_SCRIPT_SRC}?id=${measurementId}`;
  document.head.appendChild(script);

  return true;
}

// Consent mode signals for vendors that are already present on the page.
// Every call is best effort: a vendor that never loaded simply ignores it.
function syncVendorConsent(granted) {
  if (!isBrowser()) return;

  try {
    if (typeof window.fbq === 'function') window.fbq('consent', granted ? 'grant' : 'revoke');
  } catch {}
  try {
    if (window.uetq && typeof window.uetq.push === 'function') {
      window.uetq.push('consent', granted ? 'grant' : 'revoke');
    }
  } catch {}
  try {
    if (typeof window.clarity === 'function') window.clarity('consent', Boolean(granted));
  } catch {}
  try {
    if (window.ttq && typeof window.ttq.revokeConsent === 'function' && !granted) {
      window.ttq.revokeConsent();
    }
    if (window.ttq && typeof window.ttq.grantConsent === 'function' && granted) {
      window.ttq.grantConsent();
    }
  } catch {}
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', granted ? GRANTED_CONSENT_STATE : DENIED_CONSENT_STATE);
    }
  } catch {}
}

// Removes first-party cookies written by the tracking vendors.
function purgeVendorCookies() {
  if (!isBrowser() || !document.cookie) return;

  const host = window.location.hostname;
  const domains = ['', host, `.${host}`];

  document.cookie.split(';').forEach((entry) => {
    const name = entry.split('=')[0]?.trim();
    if (!name || !VENDOR_COOKIE_PATTERNS.some((pattern) => pattern.test(name))) return;
    domains.forEach((domain) => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain ? `; domain=${domain}` : ''}`;
    });
  });
}

function initAnalyticsVendors() {
  if (!isEnabled() || !vendorActivationAllowed || vendorsReady) return;
  if (!hasVendorConsent()) return;
  vendorsReady = true;
  initMetaPixel();
  initMicrosoftUet();
  initClarity();
}

function buildMetaParams(eventName, params) {
  const out = { ...params };
  const listingId = params.listing_id || params.ad_id;
  if (listingId && !out.content_ids) out.content_ids = [`ad_${listingId}`];
  if (params.content_id && !out.content_ids) out.content_ids = [params.content_id];
  if (params.category && !out.content_category) out.content_category = params.category;
  if (params.item_name && !out.content_name) out.content_name = params.item_name;
  if (eventName === 'search' && params.search_term && !out.search_string) out.search_string = params.search_term;
  return out;
}

function sendToMeta(eventName, params) {
  const fbq = getFbq();
  if (!fbq) return;

  // These events are sent and deduplicated with eventID via metaCapiBridge.js.
  // We MUST NOT send them directly here as it creates duplicates without eventID.
  const ignoredForBridge = [
    'ad_posted',
    'listing_published',
    'favorite_added',
    'add_to_wishlist',
    'contact_opened',
    'contact_click',
    'whatsapp_click',
    'telegram_click',
    'phone_click',
    'email_click',
    'message_started',
    'sign_up'
  ];
  if (ignoredForBridge.includes(eventName)) return;

  const standardName = META_STANDARD_EVENT_MAP[eventName];
  const metaParams = buildMetaParams(eventName, params);
  if (standardName) fbq('track', standardName, metaParams);
  else fbq('trackCustom', eventName, metaParams);
}

function sendToMicrosoft(eventName, params) {
  if (!isBrowser() || !window.uetq || typeof window.uetq.push !== 'function') return;

  const value = Number(params.value ?? params.event_value ?? 0);
  const payload = sanitizeParams({
    ...params,
    event_category: params.event_category || params.category || params.route_group || 'engagement',
    event_label: params.event_label || params.element_text || params.content_id || params.page_path || eventName,
    event_value: Number.isFinite(value) && value > 0 ? value : undefined,
    revenue_value: Number.isFinite(value) && value > 0 ? value : undefined,
    currency: params.currency || 'MXN',
  });
  window.uetq.push('event', eventName, payload);
}

function sendToClarity(eventName, params) {
  if (!isBrowser() || typeof window.clarity !== 'function') return;

  window.clarity('event', eventName);
  ['route_group', 'category', 'ad_id', 'store_id', 'form_name'].forEach((key) => {
    if (params[key]) window.clarity('set', key, cleanString(params[key], 80));
  });
}

function deliverVendorEvent(eventName, params) {
  // Defence in depth: even if an activation flag survived a withdrawal, no
  // vendor may receive an event without a currently granted consent.
  if (!hasVendorConsent()) return;
  sendToMeta(eventName, params);
  sendToMicrosoft(eventName, params);
  sendToClarity(eventName, params);
}

function queueVendorEvent(eventName, params) {
  pendingVendorEvents.push({ eventName, params: { ...params } });
  if (pendingVendorEvents.length > MAX_PENDING_VENDOR_EVENTS) {
    pendingVendorEvents = pendingVendorEvents.slice(-MAX_PENDING_VENDOR_EVENTS);
  }
}

// Loads every third-party vendor script. Refuses to run without a currently
// granted consent, so it can never be used as a consent side effect.
export function activateAnalyticsVendors() {
  if (!isEnabled() || !hasVendorConsent() || vendorActivationAllowed) return false;

  vendorActivationAllowed = true;
  loadGa4();
  initAnalyticsVendors();
  // Re-granting after a withdrawal must also resume vendors already on the page.
  syncVendorConsent(true);

  const queued = pendingVendorEvents;
  pendingVendorEvents = [];
  queued.forEach(({ eventName, params }) => deliverVendorEvent(eventName, params));
  window.__mercastoAnalyticsVendorsActivated = true;
  window.__mercastoAnalyticsVendorsRevoked = false;

  if (preConsentPageViewDropped) {
    preConsentPageViewDropped = false;
    // Measurement starts now, so the visitor who granted mid-session is counted
    // for the page they granted on. Nothing from before the grant is delivered.
    trackPageView(undefined, undefined, { consent_grant: true });
  }
  return true;
}

// Withdrawal: stop every vendor that is already loaded, drop queued payloads
// and erase the identifiers those vendors stored on our origin.
export function revokeAnalyticsVendors() {
  if (!isBrowser()) return false;

  const wasActive = vendorActivationAllowed;
  vendorActivationAllowed = false;
  vendorsReady = false;
  pendingVendorEvents = [];
  memorySessionId = '';

  syncVendorConsent(false);
  purgeVendorCookies();
  // The analytics session id is a first-party identifier: a withdrawal removes it.
  try {
    sessionStorage.removeItem(SESSION_ID_KEY);
  } catch {
    // Storage may be unavailable in restricted browsers.
  }

  window.__mercastoAnalyticsVendorsActivated = false;
  window.__mercastoAnalyticsVendorsRevoked = true;
  return wasActive;
}

export function trackEvent(eventName, params = {}) {
  if (!isEnabled()) return;

  const consentState = getVendorConsentState();
  const name = normalizeEventName(eventName);
  const payload = sanitizeParams({
    ...getPageContext(),
    ...params,
    platform: 'web',
    analytics_contract_version: FUNNEL_ANALYTICS_VERSION,
    // Stamped so bridges and deferred replay can tell whether the event
    // happened while the visitor had already granted consent.
    consent_state: consentState,
    session_id: getSessionId(),
  });

  if (ANALYTICS_VERBOSE) {
    console.debug('[Mercasto analytics]', name, payload);
  }

  // GA4 receives nothing that happened before a grant. The gtag() queue is
  // flushed by gtag.js when it loads, so queueing pre-consent events would
  // deliver them retroactively; a dropped page_view is re-emitted at grant time
  // instead (see activateAnalyticsVendors).
  if (consentState === 'granted') {
    const gtag = getGtag();
    if (gtag) gtag('event', name, payload);
  } else if (name === 'page_view') {
    preConsentPageViewDropped = true;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: name, ...payload });

  // Vendor events are buffered only under an existing grant: that buffer is
  // deferred delivery for consenting visitors, never a retroactive path for
  // events collected before consent. Refused and undecided visitors keep no
  // vendor buffer at all.
  if (consentState === 'granted') {
    if (vendorActivationAllowed) deliverVendorEvent(name, payload);
    else queueVendorEvent(name, payload);
  }
}

export function trackPageView(path, title, params = {}) {
  const context = getPageContext();
  trackEvent('page_view', {
    ...context,
    ...params,
    page_path: path || context.page_path,
    page_title: title || context.page_title,
  });
}

function getScrollPercent() {
  if (!isBrowser()) return 0;
  const doc = document.documentElement;
  const scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
  return Math.min(100, Math.max(0, Math.round((window.scrollY / scrollable) * 100)));
}

function resetPageEngagement() {
  pageStartedAt = Date.now();
  maxScrollPercent = getScrollPercent();
  scrollThresholdsHit = new Set();
}

function flushPageDwell(reason = 'route_change') {
  if (!isBrowser() || !pageStartedAt) return;
  const seconds = Math.round((Date.now() - pageStartedAt) / 1000);
  if (seconds < 3) return;

  trackEvent('page_dwell', {
    ...currentPageContext,
    dwell_seconds: seconds,
    max_scroll_percent: maxScrollPercent,
    reason,
  });
}

function beginPage(reason = 'init') {
  if (!isBrowser()) return;
  lastUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  currentPageContext = getPageContext();
  resetPageEngagement();
  trackPageView(currentPageContext.page_path, currentPageContext.page_title, { route_reason: reason });
  scanAdElements();
}

function handleRouteChange(reason = 'route_change') {
  if (!isBrowser()) return;
  const nextUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl === lastUrl) return;
  flushPageDwell(reason);
  setTimeout(() => beginPage(reason), 0);
}

function patchHistoryNavigation() {
  ['pushState', 'replaceState'].forEach((method) => {
    const original = window.history[method];
    if (typeof original !== 'function' || original.__mercastoAnalyticsPatched) return;

    const patched = function patchedHistoryMethod(...args) {
      const result = original.apply(this, args);
      handleRouteChange(method);
      return result;
    };
    patched.__mercastoAnalyticsPatched = true;
    window.history[method] = patched;
  });
}

function handleScroll() {
  if (scrollTicking) return;
  scrollTicking = true;
  window.requestAnimationFrame(() => {
    const percent = getScrollPercent();
    maxScrollPercent = Math.max(maxScrollPercent, percent);
    SCROLL_THRESHOLDS.forEach((threshold) => {
      if (percent >= threshold && !scrollThresholdsHit.has(threshold)) {
        scrollThresholdsHit.add(threshold);
        trackEvent('scroll_depth', { percent: threshold });
      }
    });
    scrollTicking = false;
  });
}

function safeHref(href) {
  if (!href || !isBrowser()) return '';
  try {
    const url = new URL(href, window.location.origin);
    if (url.protocol === 'tel:') return 'tel:';
    if (url.protocol === 'mailto:') return 'mailto:';
    if (url.origin === window.location.origin) return `${url.pathname}${url.search}`;
    return url.hostname;
  } catch {
    return cleanString(href, 80);
  }
}

function elementText(el) {
  if (!el) return '';
  const explicit = el.getAttribute('data-analytics-label') || el.getAttribute('aria-label') || el.getAttribute('title');
  if (explicit) return cleanString(explicit, 90);
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return '';
  return cleanString(el.innerText || el.textContent || '', 90);
}

function getElementMeta(el, event) {
  const href = el.getAttribute('href') || '';
  return sanitizeParams({
    element_tag: el.tagName?.toLowerCase(),
    element_role: el.getAttribute('role') || '',
    element_type: el.getAttribute('type') || '',
    element_text: elementText(el),
    element_id: el.getAttribute('data-analytics-id') || el.id || '',
    aria_label: el.getAttribute('aria-label') || '',
    href_path: safeHref(href),
    ad_id: el.getAttribute('data-ad-id') || '',
    click_x_bucket: event?.clientX ? Math.round(event.clientX / 50) * 50 : undefined,
    click_y_bucket: event?.clientY ? Math.round(event.clientY / 50) * 50 : undefined,
  });
}

function inferClickEvent(el, meta) {
  const customEvent = el.getAttribute('data-analytics-event');
  if (customEvent) return customEvent;

  const href = el.getAttribute('href') || '';
  const lowerHref = href.toLowerCase();
  const lowerText = String(meta.element_text || '').toLowerCase();
  // Share intents reuse the WhatsApp/Telegram/email URL schemes without addressing a
  // seller (wa.me/?text=…, t.me/share/url, mailto:?subject=…). Those are shares, never
  // contact conversions, so they must not be classified as contact clicks.
  const isShareIntent = /wa\.me\/(\?|$)/.test(lowerHref)
    || lowerHref.startsWith('https://t.me/share/')
    || /^mailto:\?/i.test(href);
  if (!isShareIntent) {
    if (lowerHref.startsWith('tel:') || lowerText.includes('teléfono') || lowerText.includes('llamar')) return 'phone_click';
    if (lowerHref.startsWith('mailto:')) return 'email_click';
    if (lowerHref.includes('wa.me') || lowerHref.includes('whatsapp') || lowerText.includes('whatsapp')) return 'whatsapp_click';
  }
  if (href) return 'link_click';
  if (el.getAttribute('type') === 'submit') return 'form_submit_click';
  if (meta.ad_id) return 'ad_card_click';
  return 'ui_click';
}

function detectRageClick(event) {
  const now = Date.now();
  recentClicks = recentClicks
    .filter((click) => now - click.at < 1400)
    .concat({ at: now, x: event.clientX || 0, y: event.clientY || 0 });

  const closeClicks = recentClicks.filter((click) => (
    Math.abs(click.x - (event.clientX || 0)) <= 32 && Math.abs(click.y - (event.clientY || 0)) <= 32
  ));

  if (closeClicks.length >= 3) {
    recentClicks = [];
    trackEvent('rage_click', {
      click_count: closeClicks.length,
      x_bucket: Math.round((event.clientX || 0) / 50) * 50,
      y_bucket: Math.round((event.clientY || 0) / 50) * 50,
    });
  }
}

function handleClick(event) {
  if (!(event.target instanceof Element)) return;
  detectRageClick(event);

  const el = event.target.closest(CLICK_SELECTOR);
  if (!el || el.closest('[data-analytics-ignore="true"]')) {
    const mutationBefore = domMutationCount;
    const urlBefore = lastUrl;
    setTimeout(() => {
      const urlNow = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (mutationBefore === domMutationCount && urlBefore === urlNow) {
        trackEvent('dead_click', {
          element_tag: event.target?.tagName?.toLowerCase?.() || '',
          x_bucket: Math.round((event.clientX || 0) / 50) * 50,
          y_bucket: Math.round((event.clientY || 0) / 50) * 50,
        });
      }
    }, 700);
    return;
  }

  const meta = getElementMeta(el, event);
  trackEvent(inferClickEvent(el, meta), meta);
}

function getFormName(form) {
  if (!form) return 'unknown_form';
  return cleanString(
    form.getAttribute('data-analytics-form') || form.getAttribute('name') || form.id || inferRouteGroup(window.location.pathname),
    80
  );
}

function labelForField(field) {
  if (!field) return '';
  const explicit = field.getAttribute('data-analytics-field') || field.getAttribute('name') || field.id || field.getAttribute('aria-label');
  if (explicit) return explicit;
  if (field.labels && field.labels.length) return field.labels[0].innerText;
  const parentLabel = field.closest('label');
  return parentLabel?.innerText || field.tagName?.toLowerCase() || 'field';
}

function valueLengthBucket(value = '') {
  const length = String(value || '').length;
  if (length === 0) return '0';
  if (length <= 10) return '1_10';
  if (length <= 50) return '11_50';
  if (length <= 140) return '51_140';
  return '141_plus';
}

function getFieldMeta(field) {
  const form = field.closest('form');
  const fieldType = (field.getAttribute('type') || field.tagName || '').toLowerCase();
  return sanitizeParams({
    form_name: getFormName(form),
    field_name: labelForField(field),
    field_type: fieldType,
    required: Boolean(field.required),
  });
}

function handleFieldFocus(event) {
  if (!(event.target instanceof HTMLElement)) return;
  if (!['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) return;
  fieldFocusStartedAt.set(event.target, Date.now());
  trackEvent('form_field_focus', getFieldMeta(event.target));
}

function handleFieldBlur(event) {
  if (!(event.target instanceof HTMLElement)) return;
  if (!['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) return;

  const startedAt = fieldFocusStartedAt.get(event.target);
  const durationMs = startedAt ? Date.now() - startedAt : 0;
  if (durationMs >= 1200) {
    trackEvent('form_field_dwell', {
      ...getFieldMeta(event.target),
      dwell_seconds: Math.round(durationMs / 1000),
      value_length_bucket: valueLengthBucket(event.target.value),
    });
  }
}

function handleFieldChange(event) {
  if (!(event.target instanceof HTMLElement)) return;
  if (!['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) return;

  const field = event.target;
  const meta = getFieldMeta(field);
  const type = (field.getAttribute('type') || field.tagName || '').toLowerCase();
  const details = { ...meta };

  if (type === 'file') {
    details.file_count = field.files?.length || 0;
    details.accept = field.getAttribute('accept') || '';
  } else if (field.tagName === 'SELECT' || type === 'checkbox' || type === 'radio') {
    details.checked = typeof field.checked === 'boolean' ? field.checked : undefined;
    if (!PII_KEY_PATTERN.test(meta.field_name || '')) details.selected_value = field.value;
  } else {
    details.value_length_bucket = valueLengthBucket(field.value);
  }

  trackEvent('form_field_change', details);
}

function handleInvalidField(event) {
  if (!(event.target instanceof HTMLElement)) return;
  trackEvent('form_validation_error', getFieldMeta(event.target));
}

function handleFormSubmit(event) {
  if (!(event.target instanceof HTMLFormElement)) return;
  trackEvent('form_submit', { form_name: getFormName(event.target) });
}

function scanAdElements() {
  if (!isBrowser() || !adObserver) return;
  document.querySelectorAll('[data-ad-id]').forEach((node) => {
    if (observedAdNodes.has(node)) return;
    observedAdNodes.add(node);
    adObserver.observe(node);
  });
}

function initAdImpressionTracking() {
  if (!isBrowser() || !('IntersectionObserver' in window) || adObserver) return;

  adObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.45) return;
      const adId = entry.target.getAttribute('data-ad-id');
      if (!adId || seenAdImpressions.has(adId)) return;

      seenAdImpressions.add(adId);
      trackEvent('ad_impression', {
        ad_id: adId,
        placement: entry.target.getAttribute('data-analytics-placement') || 'feed',
        visible_ratio: Math.round(entry.intersectionRatio * 100),
      });
      adObserver.unobserve(entry.target);
    });
  }, { threshold: [0.45, 0.75] });

  scanAdElements();
}

function initMutationTracking() {
  if (!isBrowser() || mutationObserver || !('MutationObserver' in window)) return;
  mutationObserver = new MutationObserver(() => {
    domMutationCount += 1;
    scanAdElements();
  });
  mutationObserver.observe(document.body, { childList: true, subtree: true });
}

function initPerformanceTracking() {
  if (!isBrowser() || !('PerformanceObserver' in window)) return;

  try {
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) latestLcpMs = Math.round(lastEntry.startTime);
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}

  try {
    const clsObserver = new PerformanceObserver((entryList) => {
      entryList.getEntries().forEach((entry) => {
        if (!entry.hadRecentInput) cumulativeLayoutShift += entry.value || 0;
      });
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch {}

  try {
    const fidObserver = new PerformanceObserver((entryList) => {
      const firstInput = entryList.getEntries()[0];
      if (firstInput) firstInputDelayMs = Math.round(firstInput.processingStart - firstInput.startTime);
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
  } catch {}

  try {
    const longTaskObserver = new PerformanceObserver((entryList) => {
      entryList.getEntries().forEach((entry) => {
        if (longTaskEventsSent >= 8 || entry.duration < 180) return;
        longTaskEventsSent += 1;
        trackEvent('long_task', { duration_ms: Math.round(entry.duration), start_ms: Math.round(entry.startTime) });
      });
    });
    longTaskObserver.observe({ type: 'longtask', buffered: true });
  } catch {}

  window.addEventListener('load', () => {
    setTimeout(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      trackEvent('performance_summary', {
        load_ms: navigation ? Math.round(navigation.loadEventEnd) : undefined,
        dom_content_loaded_ms: navigation ? Math.round(navigation.domContentLoadedEventEnd) : undefined,
        lcp_ms: latestLcpMs || undefined,
        cls: Number(cumulativeLayoutShift.toFixed(3)),
        fid_ms: firstInputDelayMs ?? undefined,
      });
    }, 3500);
  }, { once: true });
}

function initErrorTracking() {
  window.addEventListener('error', (event) => {
    trackEvent('frontend_error', {
      error_message: event.message || 'unknown_error',
      file: event.filename || '',
      line: event.lineno || '',
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    trackEvent('frontend_unhandled_rejection', {
      error_message: event.reason?.message || String(event.reason || 'unknown_rejection'),
    });
  });
}

function startHeartbeat() {
  if (heartbeatTimer) return;
  heartbeatTimer = window.setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    trackEvent('engagement_heartbeat', {
      seconds_on_page: Math.round((Date.now() - pageStartedAt) / 1000),
      max_scroll_percent: maxScrollPercent,
    });
  }, 30000);
}

export function initBehaviorAnalytics() {
  if (!isEnabled() || behaviorReady) return;
  behaviorReady = true;

  patchHistoryNavigation();
  initAdImpressionTracking();
  initMutationTracking();
  initPerformanceTracking();
  initErrorTracking();
  startHeartbeat();

  window.addEventListener('popstate', () => handleRouteChange('popstate'));
  window.addEventListener('hashchange', () => handleRouteChange('hashchange'));
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('click', handleClick, true);
  window.addEventListener('focusin', handleFieldFocus, true);
  window.addEventListener('focusout', handleFieldBlur, true);
  window.addEventListener('change', handleFieldChange, true);
  window.addEventListener('invalid', handleInvalidField, true);
  window.addEventListener('submit', handleFormSubmit, true);
  window.addEventListener('pagehide', () => flushPageDwell('pagehide'));

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushPageDwell('hidden');
    } else {
      trackEvent('tab_visible');
    }
  });

  beginPage('init');
}

// Key business events. Legacy ad* method names remain as callable aliases,
// but every emitted event follows the canonical cross-platform contract.
const listingViewed = (listingId, category, params = {}) =>
  trackEvent(FUNNEL_EVENTS.LISTING_VIEWED, listingAnalyticsParams(listingId, category, params));
const listingPublished = (listingId, category, params = {}) =>
  trackEvent(FUNNEL_EVENTS.LISTING_PUBLISHED, listingAnalyticsParams(listingId, category, params));
const listingUpdated = (listingId, category, params = {}) =>
  trackEvent(FUNNEL_EVENTS.LISTING_UPDATED, listingAnalyticsParams(listingId, category, params));
const contactOpened = (channel, listingId, category, params = {}) =>
  trackEvent(FUNNEL_EVENTS.CONTACT_OPENED, listingAnalyticsParams(listingId, category, {
    channel,
    contact_method: channel,
    ...params,
  }));

export const events = {
  listingViewed,
  adViewed: listingViewed,

  adImpression: (listingId, category, placement = 'feed') =>
    trackEvent('ad_impression', listingAnalyticsParams(listingId, category, { placement })),

  listingPublished,
  adPosted: listingPublished,

  listingUpdated,
  adUpdated: listingUpdated,

  publishStep: (step, category, params = {}) =>
    trackEvent('listing_publish_step', { step, step_name: step, category, ...params }),

  messageStarted: (params = {}) =>
    trackEvent(FUNNEL_EVENTS.MESSAGE_STARTED, params),

  messageSent: (params = {}) =>
    trackEvent(FUNNEL_EVENTS.MESSAGE_SENT, params),

  leadCreated: (params = {}) =>
    trackEvent('lead_created', params),

  contactOpened,
  contactClick: contactOpened,

  /**
   * Outbound share of a listing. Deliberately its own event: a share is reach, not a
   * contact conversion, so it must never be counted as one (no Contact/contact_opened,
   * no /api/meta/events/contact, no `/ads/{id}/click` contact counter).
   */
  share: (channel, listingId, category, params = {}) =>
    trackEvent('share', listingAnalyticsParams(listingId, category, {
      share_channel: channel,
      channel,
      ...params,
    })),

  offerMade: (amount, params = {}) =>
    trackEvent('offer_made', { value: amount, currency: 'MXN', ...params }),

  favoriteAdded: (params = {}) =>
    trackEvent(FUNNEL_EVENTS.FAVORITE_ADDED, params),

  phoneVerified: (params = {}) =>
    trackEvent('phone_verified', params),

  categorySelected: (category, params = {}) =>
    trackEvent('category_selected', { category, ...params }),

  homepageViewed: (params = {}) =>
    trackEvent('homepage_viewed', params),

  searchPerformed: (query, category, params = {}) =>
    trackEvent(FUNNEL_EVENTS.SEARCH, { search_term: query, category, ...params }),

  promotionViewed: (plan, params = {}) =>
    trackEvent('view_item', { item_name: plan, item_category: 'promotion', ...params }),

  purchasePromotion: (plan, amount, params = {}) =>
    trackEvent(FUNNEL_EVENTS.PURCHASE, {
      transaction_id: Date.now().toString(),
      value: amount,
      currency: 'MXN',
      items: [{ item_name: plan, item_category: 'promotion' }],
      ...params,
    }),

  registered: (params = {}) =>
    trackEvent(FUNNEL_EVENTS.SIGN_UP, params),
};
