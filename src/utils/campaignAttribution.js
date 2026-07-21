const FIRST_TOUCH_KEY = 'mercasto.attribution.first.v1';
const LAST_TOUCH_KEY = 'mercasto.attribution.last.v1';
const SESSION_TOUCH_KEY = 'mercasto.attribution.session.v1';
const PATCH_MARKER = '__mercastoCampaignAttribution';
const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const PARAMS = {
  source: 'utm_source',
  medium: 'utm_medium',
  campaign: 'utm_campaign',
  content: 'utm_content',
  term: 'utm_term',
  fbclid: 'fbclid',
  ttclid: 'ttclid',
  gclid: 'gclid',
  msclkid: 'msclkid',
};

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function clean(value, maxLength = 180) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function safeRead(storage, key) {
  try {
    const value = JSON.parse(storage.getItem(key) || 'null');
    if (!value || typeof value !== 'object') return null;
    if (!Number.isFinite(value.capturedAt) || Date.now() - value.capturedAt > ATTRIBUTION_TTL_MS) {
      storage.removeItem(key);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

function safeWrite(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Attribution must never block navigation in restricted browsers.
  }
}

function inferPaidSource(params) {
  if (params.get(PARAMS.fbclid)) return { source: 'facebook', medium: 'paid_social', clickPlatform: 'meta' };
  if (params.get(PARAMS.ttclid)) return { source: 'tiktok', medium: 'paid_social', clickPlatform: 'tiktok' };
  if (params.get(PARAMS.gclid)) return { source: 'google', medium: 'cpc', clickPlatform: 'google' };
  if (params.get(PARAMS.msclkid)) return { source: 'microsoft', medium: 'cpc', clickPlatform: 'microsoft' };
  return null;
}

function inferReferrer() {
  if (!document.referrer) return null;

  try {
    const referrer = new URL(document.referrer);
    if (referrer.origin === window.location.origin) return null;

    const hostname = referrer.hostname.replace(/^www\./, '').toLowerCase();
    const knownSources = [
      ['google.', 'google'],
      ['bing.com', 'bing'],
      ['facebook.com', 'facebook'],
      ['instagram.com', 'instagram'],
      ['tiktok.com', 'tiktok'],
      ['youtube.com', 'youtube'],
      ['linkedin.com', 'linkedin'],
      ['x.com', 'x'],
      ['twitter.com', 'x'],
    ];
    const source = knownSources.find(([needle]) => hostname.includes(needle))?.[1] || hostname;

    return {
      source,
      medium: ['google', 'bing'].includes(source) ? 'organic' : 'referral',
      referrerHost: hostname,
    };
  } catch {
    return null;
  }
}

function attributionFromUrl(rawUrl = window.location.href, allowReferrer = false) {
  let url;
  try {
    url = new URL(String(rawUrl), window.location.href);
  } catch {
    return null;
  }

  if (url.origin !== window.location.origin) return null;

  const params = url.searchParams;
  const paid = inferPaidSource(params);
  const source = clean(params.get(PARAMS.source) || paid?.source);
  const medium = clean(params.get(PARAMS.medium) || paid?.medium);
  const campaign = clean(params.get(PARAMS.campaign));
  const content = clean(params.get(PARAMS.content));
  const term = clean(params.get(PARAMS.term));
  const clickPlatform = clean(paid?.clickPlatform);
  const hasExplicitCampaign = Boolean(source || medium || campaign || content || term || clickPlatform);
  const referral = allowReferrer && !hasExplicitCampaign ? inferReferrer() : null;

  if (!hasExplicitCampaign && !referral) return null;

  return {
    source: source || clean(referral?.source),
    medium: medium || clean(referral?.medium),
    campaign,
    content,
    term,
    clickPlatform,
    referrerHost: clean(referral?.referrerHost),
    paid: Boolean(paid || /^(cpc|ppc|paid|paid_social|display|affiliate)$/i.test(medium)),
    landingPath: clean(`${url.pathname}${url.search}`, 500),
    capturedAt: Date.now(),
  };
}

function persistAttribution(attribution) {
  if (!attribution) return;

  const firstTouch = safeRead(localStorage, FIRST_TOUCH_KEY);
  if (!firstTouch) safeWrite(localStorage, FIRST_TOUCH_KEY, attribution);

  safeWrite(localStorage, LAST_TOUCH_KEY, attribution);
  safeWrite(sessionStorage, SESSION_TOUCH_KEY, attribution);
}

export function getCampaignAttribution() {
  if (!isBrowser()) return {};

  const sessionTouch = safeRead(sessionStorage, SESSION_TOUCH_KEY);
  const lastTouch = safeRead(localStorage, LAST_TOUCH_KEY);
  const firstTouch = safeRead(localStorage, FIRST_TOUCH_KEY);
  const active = sessionTouch || lastTouch || firstTouch || {};

  return {
    attribution_source: clean(active.source),
    attribution_medium: clean(active.medium),
    attribution_campaign: clean(active.campaign),
    attribution_content: clean(active.content),
    attribution_term: clean(active.term),
    attribution_paid: Boolean(active.paid),
    attribution_click_platform: clean(active.clickPlatform),
    attribution_landing_path: clean(active.landingPath, 500),
    first_touch_source: clean(firstTouch?.source),
    first_touch_campaign: clean(firstTouch?.campaign),
  };
}

function isGtagArguments(item) {
  return Boolean(item && typeof item === 'object' && item[0] === 'event');
}

function enrichPlainEvent(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item) || isGtagArguments(item)) return item;
  Object.assign(item, getCampaignAttribution());
  return item;
}

function enrichGtagArguments(item) {
  if (!isGtagArguments(item)) return item;
  if (!item[2] || typeof item[2] !== 'object') item[2] = {};
  Object.assign(item[2], getCampaignAttribution());
  return item;
}

function patchDataLayer() {
  window.dataLayer = window.dataLayer || [];
  const currentPush = window.dataLayer.push;
  if (currentPush?.[PATCH_MARKER]) return;

  function attributedPush(...items) {
    items.forEach((item) => {
      enrichPlainEvent(item);
      enrichGtagArguments(item);
    });
    return currentPush.apply(this, items);
  }

  Object.defineProperty(attributedPush, PATCH_MARKER, { value: true });
  window.dataLayer.push = attributedPush;
  window.dataLayer.forEach((item) => {
    enrichPlainEvent(item);
    enrichGtagArguments(item);
  });
}

function capture(rawUrl, allowReferrer = false) {
  const attribution = attributionFromUrl(rawUrl, allowReferrer);
  if (attribution) persistAttribution(attribution);
}

function patchHistory() {
  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  window.history.pushState = function attributedPushState(state, title, url) {
    const result = originalPushState.call(this, state, title, url);
    capture(url ?? window.location.href, false);
    return result;
  };

  window.history.replaceState = function attributedReplaceState(state, title, url) {
    const result = originalReplaceState.call(this, state, title, url);
    capture(url ?? window.location.href, false);
    return result;
  };
}

export function installCampaignAttribution() {
  if (!isBrowser() || window.__mercastoCampaignAttributionInstalled) return;
  window.__mercastoCampaignAttributionInstalled = true;

  capture(window.location.href, true);
  patchDataLayer();
  patchHistory();
  window.addEventListener('popstate', () => capture(window.location.href, false));
  window.__mercastoCampaignAttribution = getCampaignAttribution;
}
