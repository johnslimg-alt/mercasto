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
