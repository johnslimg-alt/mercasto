import { expect, test } from '@playwright/test';

// P0 privacy regression: Mercasto must never fetch a tracking vendor script
// (Meta Pixel, TikTok Pixel, GA4, Bing UET, Clarity) before the visitor grants
// analytics consent through the cookie banner.
//
// Every off-origin request is intercepted here, so the assertions below measure
// the real network behaviour of the built bundle without contacting a vendor.

const APP_HOSTS = new Set(['127.0.0.1', 'localhost']);

const APP_ORIGIN = 'https://mercasto.com';

// URL parsing helpers: every host comparison below is an exact hostname match,
// never a substring test, so a lookalike such as
// `analytics.tiktok.com.evil.example` can never be counted as vendor traffic.
const hostOf = (input) => {
  try {
    return new URL(String(input), APP_ORIGIN).hostname;
  } catch {
    return '';
  }
};

const pathOf = (input) => {
  try {
    return new URL(String(input), APP_ORIGIN).pathname;
  } catch {
    return '';
  }
};

// Hosts that are expected third-party traffic for this page but are not
// tracking vendors: map tiles, and our own API when the bundle bakes in the
// absolute production host (VITE_API_BASE_URL is not set for CI builds).
const ALLOWED_THIRD_PARTY_HOST_PATTERN = /^(?:[a-z]\.tile\.|www\.)?openstreetmap\.org$|^(?:www\.)?mercasto\.com$/;

// Exact hosts each vendor is fetched from (the app requests www.clarity.ms,
// not the bare domain), plus the bare Clarity domain so a lookalike-free
// denylist still covers both forms.
const VENDOR_HOSTS = [
  'connect.facebook.net',
  'analytics.tiktok.com',
  'www.googletagmanager.com',
  'bat.bing.com',
  'www.clarity.ms',
  'clarity.ms',
];

// GA4 and TikTok ship a hard-coded id in the repository, so every build loads
// them once consent is granted. Meta, Bing and Clarity read their ids from
// build-time env vars that the CI browser shards do not provide: assert their
// request whenever the loader actually ran, which still proves the consent gate
// without depending on deployment configuration.
const ALWAYS_LOADED_VENDORS = [
  { name: 'ga4', host: 'www.googletagmanager.com' },
  { name: 'tiktok-pixel', host: 'analytics.tiktok.com' },
];

const BUILD_GATED_VENDORS = [
  { name: 'meta-pixel', host: 'connect.facebook.net', loadedFlag: '__mercastoMetaPixelLoaded' },
  { name: 'bing-uet', host: 'bat.bing.com', loadedFlag: '__mercastoUetLoaded' },
  { name: 'clarity', host: 'www.clarity.ms', loadedFlag: '__mercastoClarityLoaded' },
];

const REJECT_LABEL = 'Solo esenciales';
const ACCEPT_LABEL = 'Aceptar todas';

function seedBrowserState(consent) {
  localStorage.setItem('cookiesAccepted', 'true');
  localStorage.setItem('lang', 'es');
  localStorage.setItem('mercasto_language', 'es');
  localStorage.removeItem('mercasto_privacy_tracking_consent');
  if (consent) localStorage.setItem('cookie_consent', consent);
  else localStorage.removeItem('cookie_consent');
}

// Records every request that leaves the application origin and answers it
// locally. Returns the live list of contacted hosts/paths.
async function interceptVendorTraffic(page) {
  const hits = [];

  await page.route('**/*', async (route) => {
    const request = route.request();
    let url;
    try {
      url = new URL(request.url());
    } catch {
      return route.continue();
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') return route.continue();
    if (APP_HOSTS.has(url.hostname)) return route.continue();

    hits.push(url.href);
    if (VENDOR_HOSTS.includes(url.hostname)) {
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: `/* ${url.hostname} stub */` });
    }
    return route.fulfill({ status: 204, contentType: 'application/json', body: '{}' });
  });

  return hits;
}

const trackingHits = (hits) => hits.filter((hit) => VENDOR_HOSTS.includes(hostOf(hit)));
const unexpectedHits = (hits) => hits.filter((hit) => (
  !VENDOR_HOSTS.includes(hostOf(hit))
  && !ALLOWED_THIRD_PARTY_HOST_PATTERN.test(hostOf(hit))
));

async function waitForVendor(page, hits, vendor) {
  if (vendor.loadedFlag) {
    const loaderRan = await page.evaluate((flag) => Boolean(window[flag]), vendor.loadedFlag);
    if (!loaderRan) {
      test.info().annotations.push({
        type: 'vendor-build-gated',
        description: `${vendor.name} is not configured in this build (missing build-time id); request assertion skipped`,
      });
      return;
    }
  }

  await expect
    .poll(() => hits.some((hit) => hostOf(hit) === vendor.host), {
      message: `${vendor.name} must load once consent is granted`,
      timeout: 20_000,
    })
    .toBeTruthy();
}

async function simulateUserActivity(page) {
  await page.dispatchEvent('body', 'pointerdown', { pointerType: 'mouse', button: 0, bubbles: true });
  await page.dispatchEvent('body', 'touchstart', { touches: [], bubbles: true });
  await page.mouse.click(5, 420);
  await page.keyboard.press('Tab');
  await page.evaluate(() => window.scrollTo(0, 800));
  await page.mouse.wheel(0, 900);
}

test.describe('consent gated tracking vendors', () => {
  test.use({ locale: 'es-MX' });

  test('rejecting the cookie banner keeps every vendor host silent', async ({ page }) => {
    test.setTimeout(60_000);
    const hits = await interceptVendorTraffic(page);
    await page.addInitScript(seedBrowserState, null);

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const banner = page.getByRole('dialog', { name: 'Aviso de cookies' });
    await expect(banner).toBeVisible();
    await banner.getByRole('button', { name: REJECT_LABEL }).click();
    await expect(banner).toBeHidden();

    // The old capture-phase listener started vendors on this very pointerdown.
    await simulateUserActivity(page);
    await page.waitForTimeout(2500);

    expect(await page.evaluate(() => localStorage.getItem('cookie_consent'))).toBe('essential');
    expect(trackingHits(hits)).toEqual([]);
    expect(unexpectedHits(hits)).toEqual([]);
    expect(
      await page.evaluate(() => Boolean(window.__mercastoAnalyticsVendorsActivated)),
      'vendors must not be marked as activated without consent',
    ).toBeFalsy();
  });

  test('essential-only consent stays silent through a long idle window and later interaction', async ({ page }) => {
    test.setTimeout(90_000);
    const hits = await interceptVendorTraffic(page);
    await page.addInitScript(seedBrowserState, 'essential');

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Covers the removed unconditional 12s vendor fallback plus slack.
    await page.waitForTimeout(13_000);
    await simulateUserActivity(page);
    await page.waitForTimeout(2500);

    expect(trackingHits(hits)).toEqual([]);
    expect(unexpectedHits(hits)).toEqual([]);
    expect(
      await page.evaluate(() => Boolean(window.__mercastoAnalyticsVendorsActivated)),
    ).toBeFalsy();
  });

  test('rejecting the banner leaves no attribution or session storage behind', async ({ page }) => {
    test.setTimeout(60_000);
    const hits = await interceptVendorTraffic(page);
    await page.addInitScript(seedBrowserState, null);

    await page.goto('/?utm_source=facebook&utm_medium=cpc&utm_campaign=storage_regression', {
      waitUntil: 'domcontentloaded',
    });

    const banner = page.getByRole('dialog', { name: 'Aviso de cookies' });
    await expect(banner).toBeVisible();
    await banner.getByRole('button', { name: REJECT_LABEL }).click();
    await expect(banner).toBeHidden();

    await simulateUserActivity(page);
    await page.waitForTimeout(1500);

    const stored = await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    }));
    // Storage-level proof: a network-only check cannot see any of these writes.
    expect(stored.local.filter((key) => key.startsWith('mercasto.attribution.'))).toEqual([]);
    expect(stored.session.filter((key) => key.startsWith('mercasto.attribution.'))).toEqual([]);
    expect(stored.session).not.toContain('mercasto_analytics_session_id');
    expect(stored.local).not.toContain('mercasto_analytics_session_id');
    expect(trackingHits(hits)).toEqual([]);

    // Non-vacuous control: after a deliberate grant the same keys do appear.
    const settings = page.getByTestId('cookie-settings');
    await settings.scrollIntoViewIfNeeded();
    await settings.click();
    await page.getByTestId('cookie-accept-all').click();
    await expect
      .poll(() => page.evaluate(() => (
        Object.keys(localStorage).filter((key) => key.startsWith('mercasto.attribution.')).length
      )), { message: 'a grant must persist the in-memory attribution capture' })
      .toBeGreaterThan(0);
    await expect
      .poll(() => page.evaluate(() => Object.keys(sessionStorage)))
      .toContain('mercasto_analytics_session_id');
  });

  test('a funnel event raised before consent is never replayed after the grant', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    const hits = await interceptVendorTraffic(page);
    const serverRelay = [];
    // Registered after the catch-all route, so this one wins for the relay.
    await page.route('**/api/meta/events/**', async (route) => {
      serverRelay.push(route.request().url());
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
    await page.addInitScript(seedBrowserState, null);

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const banner = page.getByRole('dialog', { name: 'Aviso de cookies' });
    await expect(banner).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => Boolean(window.__mercastoMetaCapiBridgeInstalled)), { timeout: 20_000 })
      .toBeTruthy();

    // Same shape as the app's own events, pushed while consent is unknown.
    await page.evaluate(() => {
      window.dataLayer.push({
        event: 'favorite_added',
        listing_id: '7777',
        category: 'motor',
        event_id: 'pre_consent_favorite_7777',
      });
    });

    await banner.getByRole('button', { name: ACCEPT_LABEL }).click();
    await expect(banner).toBeHidden();
    await expect
      .poll(() => hits.some((hit) => hostOf(hit) === 'www.googletagmanager.com'), { timeout: 20_000 })
      .toBeTruthy();
    await page.waitForTimeout(1500);

    const tikTokQueue = await page.evaluate(() => (
      Array.from(window.ttq || [], (entry) => (Array.isArray(entry) ? entry : Array.from(entry || [])))
    ));
    expect(tikTokQueue.some((entry) => entry[0] === 'track' && entry[1] === 'AddToWishlist')).toBeFalsy();

    const metaCalls = await page.evaluate(() => (
      Array.from(window.fbq?.queue || [], (entry) => Array.from(entry))
    ));
    const metaConfigured = await page.evaluate(() => typeof window.fbq === 'function');
    if (metaConfigured) {
      expect(metaCalls.some((entry) => entry[3]?.eventID === 'pre_consent_favorite_7777')).toBeFalsy();
      // The grant itself is measured: a fresh page_view for the granting page arrives.
      expect(metaCalls.some((entry) => entry[0] === 'track' && entry[1] === 'PageView')).toBeTruthy();
    } else {
      testInfo.annotations.push({
        type: 'vendor-build-gated',
        description: 'Meta Pixel is not configured in this build; pixel replay assertions limited to TikTok',
      });
    }

    // Cookie consent gates the browser Pixel, never the first-party CAPI relay:
    // the mapped event still reaches our server, whose own consent handling
    // decides what leaves it.
    expect(serverRelay.some((url) => pathOf(url) === '/api/meta/events/wishlist')).toBeTruthy();
  });

  test('items pushed before the bridges install are never delivered to a vendor', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const hits = await interceptVendorTraffic(page);
    const serverRelay = [];
    await page.route('**/api/meta/events/**', async (route) => {
      serverRelay.push(route.request().url());
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
    // Deterministic version of the reported race: the Meta bridge chunk loads
    // slowly, so the visitor grants BEFORE it installs. Any historical item that
    // is labelled with the install-time state would then be considered consented.
    await page.route('**/assets/*', async (route) => {
      const fileName = pathOf(route.request().url()).split('/').pop() || '';
      if (/^metaCapiBridge-[^/]*\.js$/.test(fileName)) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
      return route.continue();
    });
    await page.addInitScript(seedBrowserState, null);
    // Pushed before any application script runs: every bridge sees these as history.
    await page.addInitScript(() => {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'favorite_added',
        listing_id: '6666',
        category: 'motor',
        event_id: 'historical_favorite_6666',
      });
      window.dataLayer.push({
        event: 'page_view',
        page_path: '/historical-consent-check',
        page_title: 'historical',
      });
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const banner = page.getByRole('dialog', { name: 'Aviso de cookies' });
    await expect(banner).toBeVisible();
    await banner.getByRole('button', { name: ACCEPT_LABEL }).click();
    await expect(banner).toBeHidden();
    await expect
      .poll(() => hits.some((hit) => hostOf(hit) === 'www.googletagmanager.com'), { timeout: 20_000 })
      .toBeTruthy();
    await page.waitForTimeout(1500);

    // Meta must not receive the historical wishlist event (event id is shared by
    // the browser copy and the server relay, so it identifies the item exactly).
    const metaCalls = await page.evaluate(() => (
      Array.from(window.fbq?.queue || [], (entry) => Array.from(entry))
    ));
    const metaConfigured = await page.evaluate(() => typeof window.fbq === 'function');
    if (metaConfigured) {
      expect(metaCalls.some((entry) => entry[3]?.eventID === 'historical_favorite_6666')).toBeFalsy();
    }

    // TikTok must not receive the historical wishlist event.
    const tikTokQueue = await page.evaluate(() => (
      Array.from(window.ttq || [], (entry) => (Array.isArray(entry) ? entry : Array.from(entry || [])))
    ));
    expect(tikTokQueue.some((entry) => entry[0] === 'track' && entry[1] === 'AddToWishlist')).toBeFalsy();

    // OpenAI: the historical page view must not be measured, while the grant-time
    // page view still is (build gated: the pixel id comes from a build-time env).
    const openAiPageIds = await page.evaluate(() => (
      Array.isArray(window.oaiq?.q)
        ? window.oaiq.q
          .filter((entry) => entry?.[0] === 'measure' && entry?.[1] === 'page_viewed')
          .map((entry) => entry?.[2]?.contents?.[0]?.id || '')
        : null
    ));
    if (openAiPageIds) {
      expect(openAiPageIds).not.toContain('/historical-consent-check');
      expect(openAiPageIds.length).toBeGreaterThan(0);
    } else if (!metaConfigured) {
      testInfo.annotations.push({
        type: 'vendor-build-gated',
        description: 'neither Meta Pixel nor OpenAI Ads pixel is configured in this build; browser-vendor assertions limited to TikTok',
      });
    }

    // D-111: the first-party relay is not gated by cookie consent and still
    // receives the mapped historical event.
    expect(serverRelay.some((url) => pathOf(url) === '/api/meta/events/wishlist')).toBeTruthy();
  });

  test('a mid-session grant does not report pre-consent dwell time or scroll depth', async ({ page }) => {
    test.setTimeout(60_000);
    await interceptVendorTraffic(page);
    await page.addInitScript(seedBrowserState, null);

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const banner = page.getByRole('dialog', { name: 'Aviso de cookies' });
    await expect(banner).toBeVisible();

    // Accumulate pre-consent engagement: bottom of the page, then five seconds.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(5000);

    await banner.getByRole('button', { name: ACCEPT_LABEL }).click();
    await expect(banner).toBeHidden();

    // Measurement restarts at the grant, so this dwell must cover post-grant time only.
    await page.waitForTimeout(4000);
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));

    const dwell = await page.evaluate(() => (
      [...(window.dataLayer || [])].reverse().find((item) => item?.event === 'page_dwell') || null
    ));
    expect(dwell).not.toBeNull();
    expect(dwell.dwell_seconds).toBeLessThanOrEqual(7);
    expect(dwell.max_scroll_percent).toBeLessThan(50);
  });

  test('returning consenting visitors still load vendors through the consent-aware fallback', async ({ page }) => {
    test.setTimeout(60_000);
    const hits = await interceptVendorTraffic(page);
    await page.addInitScript(seedBrowserState, 'all');

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    for (const vendor of [...ALWAYS_LOADED_VENDORS, ...BUILD_GATED_VENDORS]) {
      await waitForVendor(page, hits, vendor);
    }
  });

  test('accepting all cookies loads every vendor and keeps funnel plus UTM measurement', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    const hits = await interceptVendorTraffic(page);
    await page.addInitScript(seedBrowserState, null);

    await page.goto('/?utm_source=facebook&utm_medium=cpc&utm_campaign=consent_regression', {
      waitUntil: 'domcontentloaded',
    });

    const banner = page.getByRole('dialog', { name: 'Aviso de cookies' });
    await expect(banner).toBeVisible();
    await banner.getByRole('button', { name: ACCEPT_LABEL }).click();
    await expect(banner).toBeHidden();

    for (const vendor of [...ALWAYS_LOADED_VENDORS, ...BUILD_GATED_VENDORS]) {
      await waitForVendor(page, hits, vendor);
    }

    const pageView = await page.evaluate(() => (
      [...(window.dataLayer || [])].reverse().find((item) => item?.event === 'page_view') || null
    ));
    expect(pageView).not.toBeNull();
    expect(pageView.attribution_source).toBe('facebook');
    expect(pageView.attribution_medium).toBe('cpc');
    expect(pageView.attribution_campaign).toBe('consent_regression');
    expect(pageView.attribution_paid).toBe(true);
    expect(new URL(pageView.page_path, APP_ORIGIN).searchParams.get('utm_source')).toBe('facebook');
    expect(pageView.route_group).toBe('home');

    // Canonical funnel events keep reaching the vendor pixels after a grant.
    // favorite_added is a bridged funnel event: Meta and TikTok both receive it
    // with the shared event id generated by metaCapiBridge.
    await page.evaluate(() => {
      window.dataLayer.push({
        event: 'favorite_added',
        listing_id: '4242',
        category: 'motor',
        event_id: 'consent_regression_favorite_4242',
      });
    });

    const metaCalls = await page.evaluate(() => (
      Array.from(window.fbq?.queue || [], (entry) => Array.from(entry))
    ));
    const metaConfigured = await page.evaluate(() => typeof window.fbq === 'function');
    if (metaConfigured) {
      expect(metaCalls.some((entry) => entry[0] === 'track' && entry[1] === 'PageView')).toBeTruthy();
      expect(metaCalls.some((entry) => (
        entry[0] === 'track'
        && entry[1] === 'AddToWishlist'
        && entry[3]?.eventID === 'consent_regression_favorite_4242'
      ))).toBeTruthy();
    } else {
      testInfo.annotations.push({
        type: 'vendor-build-gated',
        description: 'Meta Pixel is not configured in this build; pixel payload assertions skipped',
      });
    }

    const tikTokQueue = await page.evaluate(() => (
      Array.from(window.ttq || [], (entry) => (Array.isArray(entry) ? entry : Array.from(entry || [])))
    ));
    expect(tikTokQueue.some((entry) => entry[0] === 'page')).toBeTruthy();

    await expect
      .poll(async () => {
        const queue = await page.evaluate(() => (
          Array.from(window.ttq || [], (entry) => (Array.isArray(entry) ? entry : Array.from(entry || [])))
        ));
        return queue.some((entry) => entry[0] === 'track' && entry[1] === 'AddToWishlist');
      }, { message: 'TikTok Pixel must receive the bridged funnel event', timeout: 15_000 })
      .toBeTruthy();

    // GA4 events are queued with their attribution context and flushed by gtag.js.
    const ga4Events = await page.evaluate(() => (
      [...(window.dataLayer || [])]
        .map((item) => (Array.isArray(item) ? item : Array.from(item || [])))
        .filter((entry) => entry[0] === 'event')
        .map((entry) => ({ name: entry[1], params: entry[2] }))
    ));
    const ga4PageView = ga4Events.find((entry) => entry.name === 'page_view');
    expect(ga4PageView).toBeTruthy();
    expect(new URL(ga4PageView.params.page_path, APP_ORIGIN).searchParams.get('utm_source')).toBe('facebook');
    expect(ga4PageView.params.analytics_contract_version).toBeTruthy();
  });

  test('withdrawing consent from the reopened banner stops vendors and purges their cookies', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    test.skip(testInfo.project.name.includes('mobile'), 'cookie settings trigger is covered on desktop');
    const hits = await interceptVendorTraffic(page);
    await page.addInitScript(seedBrowserState, 'all');
    await page.addInitScript(() => {
      document.cookie = '_ga=GA1.1.111.222; path=/';
      document.cookie = '_fbp=fb.1.111.222; path=/';
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const settings = page.getByTestId('cookie-settings');
    await expect(settings).toBeAttached();

    // Stored consent keeps vendors off the critical path: first interaction wakes them.
    await page.dispatchEvent('body', 'pointerdown', { pointerType: 'mouse', button: 0, bubbles: true });
    await expect
      .poll(() => hits.some((hit) => hostOf(hit) === 'analytics.tiktok.com'), { timeout: 20_000 })
      .toBeTruthy();

    // Wait until the always-present vendor queues exist, then make calls observable.
    await expect
      .poll(() => page.evaluate(() => Boolean(window.gtag && window.ttq)), { timeout: 20_000 })
      .toBeTruthy();

    const buildState = await page.evaluate(() => ({
      meta: typeof window.fbq === 'function',
      clarity: typeof window.clarity === 'function',
      uetq: Boolean(window.uetq),
    }));
    if (!buildState.meta || !buildState.clarity || !buildState.uetq) {
      testInfo.annotations.push({
        type: 'vendor-build-gated',
        description: `revoke assertions limited to configured vendors: ${JSON.stringify(buildState)}`,
      });
    }

    await page.evaluate(() => {
      window.__consentAudit = { meta: [], clarity: [], gtag: [], tiktok: [], uetq: [] };
      const wrap = (name, key) => {
        const original = window[name];
        if (Array.isArray(original)) {
          const push = original.push.bind(original);
          original.push = (...args) => {
            window.__consentAudit[key].push(args.flat());
            return push(...args);
          };
          return;
        }
        if (typeof original !== 'function') return;
        window[name] = (...args) => {
          window.__consentAudit[key].push(args);
          return original(...args);
        };
      };
      wrap('fbq', 'meta');
      wrap('clarity', 'clarity');
      wrap('gtag', 'gtag');
      wrap('ttq', 'tiktok');
      wrap('uetq', 'uetq');
    });

    await settings.scrollIntoViewIfNeeded();
    await settings.click();

    const banner = page.getByTestId('cookie-banner');
    await expect(banner).toBeVisible();
    await expect(page.getByTestId('cookie-consent-state')).toContainText('todas');

    await banner.getByRole('button', { name: REJECT_LABEL }).click();
    await expect(banner).toBeHidden();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('cookie_consent'))).toBe('essential');

    const audit = await page.evaluate(() => window.__consentAudit);
    expect(audit.tiktok.some((entry) => entry[0] === 'revokeConsent')).toBeTruthy();
    expect(audit.gtag.some((entry) => (
      entry[0] === 'consent'
      && entry[1] === 'update'
      && entry[2]?.analytics_storage === 'denied'
    ))).toBeTruthy();
    if (buildState.meta) {
      expect(audit.meta.some((entry) => entry[0] === 'consent' && entry[1] === 'revoke')).toBeTruthy();
    }
    if (buildState.uetq) {
      expect(audit.uetq.some((entry) => entry[0] === 'consent' && entry[1] === 'revoke')).toBeTruthy();
    }
    if (buildState.clarity) {
      expect(audit.clarity.some((entry) => entry[0] === 'consent' && entry[1] === false)).toBeTruthy();
    }

    // Already-collected identifiers are removed from this browser.
    const cookies = await page.evaluate(() => document.cookie);
    expect(cookies).not.toContain('_ga=');
    expect(cookies).not.toContain('_fbp=');

    // Nothing may be delivered to a vendor after the withdrawal.
    const metaBefore = audit.meta.length;
    const tiktokBefore = audit.tiktok.length;
    const tiktokScriptsBefore = hits.filter((hit) => hostOf(hit) === 'analytics.tiktok.com').length;
    await page.evaluate(() => {
      window.dataLayer.push({ event: 'favorite_added', listing_id: '4242', category: 'motor' });
      window.dataLayer.push({ event: 'lead_created', listing_id: '4242', category: 'motor' });
    });
    await page.waitForTimeout(1000);
    const afterWithdrawal = await page.evaluate(() => window.__consentAudit);
    expect(afterWithdrawal.meta).toHaveLength(metaBefore);
    expect(afterWithdrawal.tiktok).toHaveLength(tiktokBefore);
    // Exactly one TikTok Pixel script and exactly one gtag.js request for the whole page.
    expect(hits.filter((hit) => hostOf(hit) === 'analytics.tiktok.com')).toHaveLength(tiktokScriptsBefore);
    expect(hits.filter((hit) => hostOf(hit) === 'www.googletagmanager.com' && pathOf(hit) === '/gtag/js')).toHaveLength(1);

    // Re-opening the banner shows the refusal and re-granting resumes the same page.
    await settings.scrollIntoViewIfNeeded();
    await settings.click();
    await expect(page.getByTestId('cookie-consent-state')).toContainText('esenciales');
    await banner.getByRole('button', { name: ACCEPT_LABEL }).click();
    await expect(banner).toBeHidden();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('cookie_consent'))).toBe('all');

    const regrantAudit = await page.evaluate(() => window.__consentAudit);
    if (buildState.meta) {
      expect(regrantAudit.meta.some((entry) => entry[0] === 'consent' && entry[1] === 'grant')).toBeTruthy();
    }
    expect(
      await page.evaluate(() => Boolean(window.__mercastoAnalyticsVendorsActivated)),
      'vendors may only resume after consent is granted again',
    ).toBeTruthy();
  });
});
