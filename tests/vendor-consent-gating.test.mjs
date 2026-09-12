import assert from 'node:assert/strict';
import test from 'node:test';

// Behavioural contract for the P0 consent gate. These tests run the real
// analytics modules against a minimal fake browser so the consent matrix and
// the withdrawal teardown are verified without a bundler or a real vendor.

const APP_URL = 'https://mercasto.test/?utm_source=facebook&utm_medium=cpc&utm_campaign=consent_unit';

let moduleCounter = 0;

function installFakeBrowser({ consent = null, href = APP_URL, cookies = {} } = {}) {
  const requests = [];
  const listeners = new Map();
  const cookieJar = new Map(Object.entries({ _ga: 'GA1.1.1.2', _fbp: 'fb.1.1.2', csrf_token: 'keep', ...cookies }));
  const localStore = new Map();
  const sessionStore = new Map();

  if (consent) localStore.set('cookie_consent', consent);

  const addEventListener = (type, handler) => {
    const set = listeners.get(type) || new Set();
    set.add(handler);
    listeners.set(type, set);
  };
  const removeEventListener = (type, handler) => {
    listeners.get(type)?.delete(handler);
  };
  const dispatchEvent = (event) => {
    const type = event?.type;
    [...(listeners.get(type) || [])].forEach((handler) => handler(event));
    return true;
  };

  const record = (node) => {
    if (node?.src) requests.push(node.src);
    return node;
  };

  const document = {
    title: 'Mercasto | test',
    documentElement: { lang: 'es-MX' },
    head: { appendChild: (node) => record(node) },
    createElement: () => ({ tagName: 'SCRIPT', async: false, src: '', setAttribute() {} }),
    getElementsByTagName: () => [{ parentNode: { insertBefore: (node) => record(node) } }],
    addEventListener,
    removeEventListener,
    querySelector: () => null,
    get cookie() {
      return [...cookieJar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
    },
    set cookie(raw) {
      const [pair, ...attributes] = String(raw).split(';');
      const name = pair.split('=')[0].trim();
      const expired = attributes.some((attribute) => /expires=Thu, 01 Jan 1970/i.test(attribute.trim()));
      if (expired) cookieJar.delete(name);
      else cookieJar.set(name, pair.split('=').slice(1).join('='));
    },
  };

  const registered = new Map();
  const window = {
    location: new URL(href),
    innerWidth: 1280,
    innerHeight: 800,
    document,
    addEventListener,
    removeEventListener,
    dispatchEvent,
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (handle) => clearTimeout(handle),
    fetch: async () => ({ ok: true, clone: () => ({ json: async () => ({}) }) }),
    crypto: globalThis.crypto,
    navigator: { language: 'es-MX' },
    dataLayer: [],
    // Mirrors the inline gtag.js stub in index.html.
    __mercastoGaMeasurementId: 'G-CONSENTTEST1',
    gtag: (...args) => {
      window.dataLayer.push(args);
    },
    localStorage: {
      getItem: (key) => (localStore.has(key) ? localStore.get(key) : null),
      setItem: (key, value) => localStore.set(key, String(value)),
      removeItem: (key) => localStore.delete(key),
    },
    sessionStorage: {
      getItem: (key) => (sessionStore.has(key) ? sessionStore.get(key) : null),
      setItem: (key, value) => sessionStore.set(key, String(value)),
      removeItem: (key) => sessionStore.delete(key),
    },
  };

  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    localStorage: globalThis.localStorage,
    sessionStorage: globalThis.sessionStorage,
    navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator'),
  };

  globalThis.window = window;
  globalThis.document = document;
  globalThis.localStorage = window.localStorage;
  globalThis.sessionStorage = window.sessionStorage;
  Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true, writable: true });

  return {
    window,
    document,
    localStore,
    requests,
    registered,
    setConsent(value) {
      if (value) localStore.set('cookie_consent', value);
      else localStore.delete('cookie_consent');
      window.dispatchEvent({ type: 'mercasto:tracking-consent' });
    },
    cookies: () => cookieJar,
    restore() {
      if (previous.window === undefined) delete globalThis.window;
      else globalThis.window = previous.window;
      if (previous.document === undefined) delete globalThis.document;
      else globalThis.document = previous.document;
      if (previous.localStorage === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = previous.localStorage;
      if (previous.sessionStorage === undefined) delete globalThis.sessionStorage;
      else globalThis.sessionStorage = previous.sessionStorage;
      if (previous.navigator) Object.defineProperty(globalThis, 'navigator', previous.navigator);
      else delete globalThis.navigator;
    },
  };
}

async function loadAnalyticsModules() {
  moduleCounter += 1;
  const analytics = await import(`../src/utils/analytics.js?case=${moduleCounter}`);
  const tiktok = await import(`../src/utils/tiktokPixel.js?case=${moduleCounter}`);
  return { ...analytics, initTikTokPixel: tiktok.initTikTokPixel };
}

// Exact vendor hosts only. Request src strings may be relative in the fake
// browser, so they are resolved against this base before the hostname is
// compared: a lookalike such as `analytics.tiktok.com.evil.example` must never
// be counted as vendor traffic in a consent test.
const RESOLVE_BASE = 'https://mercasto.test/';

const VENDOR_SCRIPT_HOSTS = new Set([
  'connect.facebook.net',
  'bat.bing.com',
  'clarity.ms',
  'www.clarity.ms',
  'analytics.tiktok.com',
  'www.googletagmanager.com',
]);

const hostOf = (input) => {
  try {
    return new URL(String(input), RESOLVE_BASE).hostname;
  } catch {
    return '';
  }
};

const pathOf = (input) => {
  try {
    return new URL(String(input), RESOLVE_BASE).pathname;
  } catch {
    return '';
  }
};

const vendorRequests = (requests) => requests.filter((src) => VENDOR_SCRIPT_HOSTS.has(hostOf(src)));

test('consent state fails closed for undecided, refused and account-level withdrawals', async (t) => {
  const env = installFakeBrowser({ consent: null });
  t.after(() => env.restore());

  const { getVendorConsentState, hasVendorConsent } = await import('../src/utils/trackingConsent.js');

  assert.equal(getVendorConsentState(), 'unknown');
  assert.equal(hasVendorConsent(), false);

  env.localStore.set('cookie_consent', 'essential');
  assert.equal(getVendorConsentState(), 'denied');

  env.localStore.set('cookie_consent', 'all');
  assert.equal(getVendorConsentState(), 'granted');

  // The dashboard privacy switch and the server flag override the banner.
  env.localStore.set('mercasto_privacy_tracking_consent', 'false');
  assert.equal(getVendorConsentState(), 'denied');

  env.localStore.set('mercasto_privacy_tracking_consent', 'true');
  env.localStore.set('auth_token', 'token');
  env.localStore.set('user', JSON.stringify({ notification_preferences: { analytics_tracking_consent: false } }));
  assert.equal(getVendorConsentState(), 'denied');

  env.localStore.set('user', JSON.stringify({ notification_preferences: { analytics_tracking_consent: true } }));
  assert.equal(getVendorConsentState(), 'granted');
});

test('essential or undecided visitors never receive a vendor script or vendor event', async () => {
  for (const consent of [null, 'essential']) {
    const env = installFakeBrowser({ consent });

    try {
      const delivered = [];
      env.window.fbq = (...args) => delivered.push(['meta', ...args]);
      env.window.clarity = (...args) => delivered.push(['clarity', ...args]);
      env.window.uetq = { push: (...args) => delivered.push(['uetq', ...args]) };

      const analytics = await loadAnalyticsModules();

      assert.equal(analytics.activateAnalyticsVendors(), false, `consent=${consent} must not activate vendors`);
      analytics.initTikTokPixel();
      analytics.trackEvent('page_view', { listing_id: '4242' });
      analytics.trackEvent('lead_created', { listing_id: '4242' });

      assert.deepEqual(vendorRequests(env.requests), [], `consent=${consent} must not fetch vendor scripts`);
      assert.deepEqual(delivered, [], `consent=${consent} must not deliver vendor events`);
      assert.equal(env.window.__mercastoAnalyticsVendorsActivated, undefined);

      // First-party measurement keeps working: the app still records the events.
      const dataLayerEvents = env.window.dataLayer.filter((item) => item?.event);
      assert.ok(dataLayerEvents.some((item) => item.event === 'page_view'));
      assert.ok(dataLayerEvents.some((item) => item.event === 'lead_created'));
    } finally {
      env.restore();
    }
  }
});

test('granting consent loads the gated vendors and delivers the funnel events', async (t) => {
  const env = installFakeBrowser({ consent: 'all' });
  t.after(() => env.restore());

  const delivered = [];
  env.window.fbq = (...args) => delivered.push(['meta', ...args]);
  env.window.clarity = (...args) => delivered.push(['clarity', ...args]);
  env.window.uetq = { push: (...args) => delivered.push(['uetq', ...args]) };

  const analytics = await loadAnalyticsModules();

  // Events recorded before the vendor bundle is ready wait in the local queue.
  analytics.trackEvent('page_view', { listing_id: '4242' });
  assert.deepEqual(vendorRequests(env.requests), []);

  assert.equal(analytics.activateAnalyticsVendors(), true);
  analytics.initTikTokPixel();

  const fetched = vendorRequests(env.requests);
  assert.ok(
    fetched.some((src) => hostOf(src) === 'www.googletagmanager.com' && pathOf(src) === '/gtag/js'),
    'GA4 library must load',
  );
  assert.ok(
    fetched.some((src) => hostOf(src) === 'analytics.tiktok.com' && pathOf(src) === '/i18n/pixel/events.js'),
    'TikTok Pixel must load',
  );

  analytics.trackEvent('lead_created', { listing_id: '4242', value: 100 });

  const metaPageViews = delivered.filter(([vendor, kind, name]) => (
    vendor === 'meta' && kind === 'track' && name === 'PageView'
  ));
  assert.equal(metaPageViews.length, 1, 'the queued page_view must replay exactly once');
  assert.ok(delivered.some(([vendor, kind, name]) => vendor === 'meta' && kind === 'trackCustom' && name === 'lead_created'));
  assert.ok(delivered.some(([vendor, kind]) => vendor === 'clarity' && kind === 'event'));
  assert.ok(delivered.some(([vendor, kind, name]) => vendor === 'uetq' && kind === 'event' && name === 'lead_created'));

  // Attribution context survives the consent gate.
  const pageView = env.window.dataLayer.filter((item) => item?.event === 'page_view').at(-1);
  assert.equal(new URL(pageView.page_path, RESOLVE_BASE).searchParams.get('utm_source'), 'facebook');
  assert.equal(pageView.analytics_contract_version, '2026-08-04');
});

test('withdrawal stops vendor delivery, revokes loaded vendors and purges their cookies', async (t) => {
  const env = installFakeBrowser({ consent: 'all' });
  t.after(() => env.restore());

  const delivered = [];
  const revocations = [];
  env.window.fbq = (...args) => {
    if (args[0] !== 'consent') delivered.push(['meta', ...args]);
    revocations.push(['meta', ...args]);
  };
  env.window.clarity = (...args) => {
    if (args[0] !== 'consent') delivered.push(['clarity', ...args]);
  };
  env.window.uetq = { push: (...args) => revocations.push(['uetq', ...args]) };
  env.window.ttq = { revokeConsent: () => revocations.push(['tiktok', 'revokeConsent']), grantConsent: () => revocations.push(['tiktok', 'grantConsent']) };

  const analytics = await loadAnalyticsModules();
  analytics.activateAnalyticsVendors();
  analytics.trackEvent('page_view', { listing_id: '4242' });
  const deliveredBefore = delivered.length;
  assert.ok(deliveredBefore > 0);

  assert.equal(analytics.revokeAnalyticsVendors(), true);

  assert.ok(revocations.some(([vendor, kind, value]) => vendor === 'meta' && kind === 'consent' && value === 'revoke'));
  assert.ok(revocations.some(([vendor, kind, value]) => vendor === 'uetq' && kind === 'consent' && value === 'revoke'));
  assert.ok(revocations.some(([vendor, kind]) => vendor === 'tiktok' && kind === 'revokeConsent'));
  assert.ok(env.window.dataLayer.some((entry) => (
    Array.from(entry || [])[0] === 'consent'
    && Array.from(entry || [])[1] === 'update'
    && Array.from(entry || [])[2]?.analytics_storage === 'denied'
  )), 'GA4 consent mode must be switched to denied');

  const cookies = env.cookies();
  assert.equal(cookies.has('_ga'), false, 'vendor cookies must be purged');
  assert.equal(cookies.has('_fbp'), false, 'vendor cookies must be purged');
  assert.equal(cookies.get('csrf_token'), 'keep', 'essential cookies must survive');

  // Nothing may reach a vendor after the withdrawal.
  analytics.trackEvent('lead_created', { listing_id: '4242' });
  analytics.trackEvent('favorite_added', { listing_id: '4242' });
  assert.equal(delivered.length, deliveredBefore);

  // A later grant resumes the same page.
  env.setConsent('all');
  assert.equal(analytics.activateAnalyticsVendors(), true);
  const grantedIndex = revocations.findIndex(([vendor, kind, value]) => (
    vendor === 'meta' && kind === 'consent' && value === 'grant'
  ));
  assert.ok(grantedIndex >= 0, 're-granting consent must resume the Meta Pixel');
});
