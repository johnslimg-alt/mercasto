import { expect, test } from '@playwright/test';

// Regression for the consent-withdrawal entry point.
//
// The consent dialog is loaded lazily (App.jsx renders it through React.lazy), so a
// "cookie settings" click can arrive before the dialog has mounted and registered its
// opener. Before the intent registry in src/utils/trackingConsent.js the click only
// dispatched a transient event that nobody was listening for yet, so it was silently
// dropped: the visitor asked to withdraw consent and nothing happened.
//
// The chunk is held open with route interception rather than delayed by a fixed sleep,
// so the click provably lands while the dialog is still in flight (the test asserts the
// dialog is absent at that moment) instead of relying on timing luck.

const VENDOR_HOSTS = [
  'connect.facebook.net',
  'analytics.tiktok.com',
  'www.googletagmanager.com',
  'bat.bing.com',
  'www.clarity.ms',
  'clarity.ms',
];

const APP_HOSTS = new Set(['127.0.0.1', 'localhost']);

async function interceptOffOriginTraffic(page) {
  const hits = [];
  let releaseChunk;
  let chunkInFlight = false;
  const chunkGate = new Promise((resolve) => { releaseChunk = resolve; });

  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());

    if (!APP_HOSTS.has(url.hostname)) {
      hits.push(url.hostname);
      return route.fulfill({ status: 204, contentType: 'application/json', body: '{}' });
    }

    // Hold the consent dialog chunk so the entry point is exercised while the
    // dialog genuinely has not mounted yet.
    if (/CookieBanner-.*\.js$/.test(url.pathname)) {
      chunkInFlight = true;
      await chunkGate;
    }
    return route.continue();
  });

  return {
    hits,
    isChunkInFlight: () => chunkInFlight,
    releaseChunk: () => releaseChunk(),
  };
}

test.describe('cookie preferences entry point', () => {
  test.use({ locale: 'es-MX' });

  test('a click made before the lazily loaded dialog mounts still opens it', async ({ page }) => {
    const traffic = await interceptOffOriginTraffic(page);

    await page.addInitScript(() => {
      localStorage.setItem('cookiesAccepted', 'true');
      localStorage.setItem('lang', 'es');
      localStorage.setItem('mercasto_language', 'es');
      localStorage.setItem('cookie_consent', 'essential');
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const settings = page.getByTestId('cookie-settings');
    await expect(settings).toBeAttached();
    await expect.poll(traffic.isChunkInFlight, { timeout: 15_000 }).toBe(true);

    // The dialog is not mounted (its chunk is still held), so the click below is a
    // genuine pre-mount request.
    await expect(page.getByTestId('cookie-banner')).toHaveCount(0);

    await settings.scrollIntoViewIfNeeded();
    await settings.click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('cookie-banner'), 'the held chunk must keep the dialog unmounted')
      .toHaveCount(0);

    // Let the dialog chunk finish loading: the pending request must be replayed.
    traffic.releaseChunk();
    await expect(page.getByTestId('cookie-banner')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('cookie-consent-state')).toContainText('esenciales');

    // Opening the dialog must not change the stored decision and must not wake any
    // tracking vendor.
    await expect.poll(() => page.evaluate(() => localStorage.getItem('cookie_consent'))).toBe('essential');
    expect(traffic.hits.filter((host) => VENDOR_HOSTS.includes(host))).toEqual([]);
  });

  test('a click made after the dialog is mounted opens it straight away', async ({ page }) => {
    const traffic = await interceptOffOriginTraffic(page);

    await page.addInitScript(() => {
      localStorage.setItem('lang', 'es');
      localStorage.setItem('mercasto_language', 'es');
      localStorage.setItem('cookie_consent', 'all');
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    traffic.releaseChunk();

    const settings = page.getByTestId('cookie-settings');
    await expect(settings).toBeAttached();
    await settings.scrollIntoViewIfNeeded();
    await settings.click();

    await expect(page.getByTestId('cookie-banner')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('cookie-consent-state')).toContainText('todas');

    await page.getByTestId('cookie-essential').click();
    await expect(page.getByTestId('cookie-banner')).toBeHidden();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('cookie_consent'))).toBe('essential');
  });
});
