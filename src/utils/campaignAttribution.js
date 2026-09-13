import { classifyReferrerHost, isAiReferralSource, normalizeTrafficSource } from './trafficSourceClassification.js';
import { getVendorConsentState, hasVendorConsent, subscribeTrackingConsent } from './trackingConsent.js';

const FIRST_TOUCH_KEY = 'mercasto.attribution.first.v1';
const LAST_TOUCH_KEY = 'mercasto.attribution.last.v1';
const SESSION_TOUCH_KEY = 'mercasto.attribution.session.v1';
const PATCH_MARKER = '__mercastoCampaignAttribution';
const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Campaign context captured before an analytics consent grant. It stays in
// memory only: nothing is written to localStorage/sessionStorage until the
// visitor grants, so a visitor who declines leaves no stored attribution trace.
// The cost of a reload before consent is the in-memory first touch (the landing
// campaign of that page load), which is re-captured from the new URL/referrer.
let pendingFirstTouch = null;
let pendingLastTouch = null;
// True once this page session persisted attribution under a grant.
let persistedWhileGranted = false;

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
    const classified = classifyReferrerHost(hostname);
    const knownSources = [
      ['facebook.com', 'facebook'],
      ['instagram.com', 'instagram'],
      ['tiktok.com', 'tiktok'],
      ['youtube.com', 'youtube'],
      ['linkedin.com', 'linkedin'],
      ['x.com', 'x'],
      ['twitter.com', 'x'],
    ];
    const socialSource = knownSources.find(([needle]) => hostname.includes(needle))?.[1];

    return {
      source: socialSource || classified.source,
      medium: socialSource ? 'referral' : classified.medium,
      channel: socialSource ? 'referral' : classified.channel,
      referrerHost: hostname,
    };
  } catch {
    return null;
  }
}

export function attributionFromUrl(rawUrl = window.location.href, allowReferrer = false) {
  let url;
  try {
    url = new URL(String(rawUrl), window.location.href);
  } catch {
    return null;
  }

  if (url.origin !== window.location.origin) return null;

  const params = url.searchParams;
  const paid = inferPaidSource(params);
  const source = clean(normalizeTrafficSource(params.get(PARAMS.source) || paid?.source));
  const requestedMedium = clean(params.get(PARAMS.medium) || paid?.medium);
  const medium = requestedMedium || (isAiReferralSource(source) ? 'ai_referral' : '');
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
    channel: clean(referral?.channel || (isAiReferralSource(source) ? 'ai_referral' : '')),
    referrerHost: clean(referral?.referrerHost),
    paid: Boolean(paid || /^(cpc|ppc|paid|paid_social|display|affiliate)$/i.test(medium)),
    landingPath: clean(`${url.pathname}${url.search}`, 500),
    capturedAt: Date.now(),
  };
}

function persistAttribution(attribution) {
  if (!attribution) return;

  // Persistence only happens under a grant (capture gate or flush), so this marks
  // that a later refusal is a live granted -> denied withdrawal whose values are
  // worth keeping in memory for a possible re-grant.
  persistedWhileGranted = true;

  const firstTouch = safeRead(localStorage, FIRST_TOUCH_KEY);
  if (!firstTouch) safeWrite(localStorage, FIRST_TOUCH_KEY, attribution);

  safeWrite(localStorage, LAST_TOUCH_KEY, attribution);
  safeWrite(sessionStorage, SESSION_TOUCH_KEY, attribution);
}

// Consent-gated write path. Before a grant the capture waits in memory; once
// consent is granted the pending capture is flushed and later captures persist
// directly (unchanged behaviour for consenting visitors).
function rememberPendingAttribution(attribution) {
  if (!pendingFirstTouch) pendingFirstTouch = attribution;
  pendingLastTouch = attribution;
}

function flushPendingAttribution() {
  if (!hasVendorConsent()) return;

  const first = pendingFirstTouch;
  const last = pendingLastTouch;
  pendingFirstTouch = null;
  pendingLastTouch = null;

  if (first) persistAttribution(first);
  if (last && last !== first) persistAttribution(last);
}

// A refusal erases campaign storage written by an earlier session. For a live
// granted -> denied withdrawal the values are first moved into the in-memory
// capture (memory only, never persisted), so withdrawing and granting again on
// the same landing page keeps its attribution. That preservation is deliberately
// limited to withdrawals this page session actually granted: copying stale
// attribution during the initial cleanup of an already-refused visitor would
// resurrect an old campaign for their next grant and misattribute the session.
function preservePendingFromStorage() {
  if (!pendingFirstTouch) {
    const storedFirst = safeRead(localStorage, FIRST_TOUCH_KEY);
    if (storedFirst) pendingFirstTouch = storedFirst;
  }
  if (!pendingLastTouch) {
    const storedLast = safeRead(sessionStorage, SESSION_TOUCH_KEY) || safeRead(localStorage, LAST_TOUCH_KEY);
    if (storedLast) pendingLastTouch = storedLast;
  }
}

function clearStoredAttribution({ preserve = false } = {}) {
  if (preserve && persistedWhileGranted) preservePendingFromStorage();

  try {
    localStorage.removeItem(FIRST_TOUCH_KEY);
    localStorage.removeItem(LAST_TOUCH_KEY);
    sessionStorage.removeItem(SESSION_TOUCH_KEY);
  } catch {
    // Storage may be unavailable in restricted browsers.
  }
}

export function getCampaignAttribution() {
  if (!isBrowser()) return {};

  const sessionTouch = safeRead(sessionStorage, SESSION_TOUCH_KEY);
  const lastTouch = safeRead(localStorage, LAST_TOUCH_KEY);
  const firstTouch = safeRead(localStorage, FIRST_TOUCH_KEY);
  const active = pendingLastTouch || sessionTouch || lastTouch || firstTouch || {};
  const first = firstTouch || pendingFirstTouch;

  return {
    attribution_source: clean(active.source),
    attribution_medium: clean(active.medium),
    attribution_campaign: clean(active.campaign),
    attribution_content: clean(active.content),
    attribution_term: clean(active.term),
    attribution_paid: Boolean(active.paid),
    attribution_click_platform: clean(active.clickPlatform),
    attribution_channel: clean(active.channel),
    attribution_referrer_host: clean(active.referrerHost),
    attribution_ai_referral: active.channel === 'ai_referral' || isAiReferralSource(active.source),
    attribution_landing_path: clean(active.landingPath, 500),
    first_touch_source: clean(first?.source),
    first_touch_campaign: clean(first?.campaign),
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
  if (!attribution) return;

  if (!hasVendorConsent()) {
    rememberPendingAttribution(attribution);
    return;
  }

  persistAttribution(attribution);
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

  // Consent gate: attribute storage is written only after a grant. A visitor who
  // already refused starts clean (initial cleanup, nothing preserved), and a
  // later grant flushes the in-memory capture.
  if (getVendorConsentState() === 'denied') clearStoredAttribution();
  subscribeTrackingConsent((state) => {
    if (state === 'granted') {
      flushPendingAttribution();
      return;
    }
    if (state === 'denied') {
      // Live withdrawal: keep this session's values in memory for a re-grant.
      clearStoredAttribution({ preserve: true });
    }
  });
}
