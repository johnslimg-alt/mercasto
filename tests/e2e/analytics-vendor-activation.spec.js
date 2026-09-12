import { expect, test } from '@playwright/test';

const VENDOR_PATTERNS = [
  /connect\.facebook\.net\/.*fbevents\.js/,
  /analytics\.tiktok\.com\/.*events\.js/,
  /bat\.bing\.com\/bat\.js/,
  /clarity\.ms\/tag\//,
];

test('analytics vendors wait for interaction and replay queued events', async ({ page }) => {
  const vendorRequests = [];
  const metaServerEvents = [];

  await page.addInitScript(() => {
    localStorage.setItem('cookiesAccepted', 'true');
    // Vendors are consent gated: this contract covers the consenting visitor.
    localStorage.setItem('cookie_consent', 'all');
  });

  for (const pattern of VENDOR_PATTERNS) {
    await page.route(pattern, async route => {
      vendorRequests.push(route.request().url());
      await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    });
  }

  await page.route('**/api/meta/events/**', async route => {
    metaServerEvents.push(route.request().url());
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });

  await page.goto('/listings', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate(() => Boolean(window.__mercastoAnalyticsVendorActivationScheduled))).toBeTruthy();
  await expect.poll(() => page.evaluate(() => Boolean(window.__mercastoMetaCapiBridgeInstalled))).toBeTruthy();
  await expect.poll(() => page.evaluate(() => (
    Array.isArray(window.dataLayer)
      && window.dataLayer.some(item => item?.event === 'page_view')
  ))).toBeTruthy();

  await page.evaluate(() => {
    window.dataLayer.push({
      event: 'favorite_added',
      listing_id: '6336',
      category: 'motor',
      event_id: 'queued_favorite_6336',
    });
  });
  await expect.poll(() => metaServerEvents.length).toBeGreaterThan(0);

  await page.waitForTimeout(1800);
  expect(vendorRequests).toEqual([]);
  expect(await page.evaluate(() => Boolean(window.__mercastoAnalyticsVendorsActivated))).toBeFalsy();

  await page.evaluate(() => {
    window.__testFbqEvents = [];
    window.fbq = (...args) => window.__testFbqEvents.push(args);
  });

  await page.dispatchEvent('body', 'pointerdown', {
    pointerType: 'mouse',
    button: 0,
    bubbles: true,
  });

  await expect.poll(() => page.evaluate(() => Boolean(window.__mercastoAnalyticsVendorsActivated))).toBeTruthy();
  await expect.poll(() => vendorRequests.some(url => url.includes('analytics.tiktok.com'))).toBeTruthy();

  const browserEvents = await page.evaluate(() => window.__testFbqEvents || []);
  expect(browserEvents.some(entry => entry[0] === 'track' && entry[1] === 'PageView')).toBeTruthy();
  const replayedFavorites = browserEvents.filter(entry => (
    entry[0] === 'track'
      && entry[1] === 'AddToWishlist'
      && entry[3]?.eventID === 'queued_favorite_6336'
  ));
  expect(replayedFavorites).toHaveLength(1);

  const tiktokQueue = await page.evaluate(() => (
    Array.from(window.ttq || [], entry => Array.isArray(entry) ? entry : Array.from(entry || []))
  ));
  expect(tiktokQueue.some(entry => entry[0] === 'page')).toBeTruthy();
});

test('PostAd shares one event id between browser Pixel and server CAPI after a successful publish signal', async ({ page }) => {
  const serverEvents = [];

  await page.addInitScript(() => {
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'all');
  });

  for (const pattern of VENDOR_PATTERNS) {
    await page.route(pattern, async route => {
      await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    });
  }

  await page.route('**/api/meta/events/post-ad', async route => {
    serverEvents.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, meta_ok: true }),
    });
  });

  await page.goto('/listings', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate(() => Boolean(window.__mercastoMetaCapiBridgeInstalled))).toBeTruthy();

  await page.evaluate(() => {
    window.__testFbqEvents = [];
    window.fbq = (...args) => window.__testFbqEvents.push(args);
    window.dataLayer.push({
      event: 'listing_published',
      listing_id: '7001',
      ad_id: '7001',
      content_id: 'ad_7001',
      category: 'motor',
    });
  });

  await expect.poll(() => serverEvents.length).toBe(1);
  const serverEvent = serverEvents[0];
  expect(serverEvent.listing_id).toBe('7001');
  expect(serverEvent.event_id).toMatch(/^post-ad_7001_[A-Za-z0-9._:-]+$/);

  const browserEvent = await page.evaluate(() => (
    (window.__testFbqEvents || []).find(entry => entry[0] === 'trackCustom' && entry[1] === 'PostAd') || null
  ));
  expect(browserEvent).toBeTruthy();
  expect(browserEvent[3]?.eventID).toBe(serverEvent.event_id);

  const dataLayerEventId = await page.evaluate(() => (
    [...window.dataLayer].reverse().find(item => item?.event === 'listing_published')?.event_id || ''
  ));
  expect(dataLayerEventId).toBe(serverEvent.event_id);
});

test('PostAd is not emitted without a real listing id', async ({ page }) => {
  const serverEvents = [];

  await page.addInitScript(() => {
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'all');
  });

  for (const pattern of VENDOR_PATTERNS) {
    await page.route(pattern, async route => {
      await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    });
  }

  await page.route('**/api/meta/events/post-ad', async route => {
    serverEvents.push(route.request().postDataJSON());
    await route.fulfill({ status: 422, contentType: 'application/json', body: '{"message":"listing_id required"}' });
  });

  await page.goto('/listings', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate(() => Boolean(window.__mercastoMetaCapiBridgeInstalled))).toBeTruthy();
  await page.waitForTimeout(100);
  const baselineServerCalls = serverEvents.length;

  await page.evaluate(() => {
    window.__testFbqEvents = [];
    window.fbq = (...args) => window.__testFbqEvents.push(args);
    window.dataLayer.push({ event: 'listing_published', category: 'motor' });
  });

  await page.waitForTimeout(250);
  expect(serverEvents).toHaveLength(baselineServerCalls);
  const browserEvents = await page.evaluate(() => window.__testFbqEvents || []);
  expect(browserEvents.some(entry => entry[1] === 'PostAd')).toBeFalsy();
});
