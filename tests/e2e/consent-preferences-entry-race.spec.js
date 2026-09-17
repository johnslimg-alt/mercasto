import { expect, test } from '@playwright/test';

// Regression for the consent-withdrawal entry point.
//
// History: the consent dialog used to be loaded through React.lazy in App.jsx, so a
// "cookie settings" click could arrive before the dialog had mounted and registered its
// opener. Before the intent registry in src/utils/trackingConsent.js the click only
// dispatched a transient event that nobody was listening for yet, so it was silently
// dropped: the visitor asked to withdraw consent and nothing happened. PR #1171 fixed
// that with the registry, which stays in place as belt-and-braces and keeps its own
// contract test in tests/consent-preferences-registry.test.mjs (a request that arrives
// before the opener registers is remembered and flushed exactly once).
//
// The lazy boundary is now gone: the dialog is a static import, so it owns no chunk that
// can fail on its own. That boundary was also an availability coupling on a legal
// requirement - a failed `CookieBanner-*.js` fetch threw into the root ErrorBoundary,
// which replaced the whole app and then let staleChunkRecovery navigate to
// `/?__mercasto_refresh=<ts>`.
//
// These tests therefore replace the old "hold the chunk open, click, release" method
// (its chunk premise can no longer fire, because no such request exists) with the
// condition it was standing in for: every request that would be a consent-owned chunk is
// aborted. The dialog must still be reachable, and the app must not be replaced.

const VENDOR_HOSTS = [
  'connect.facebook.net',
  'analytics.tiktok.com',
  'www.googletagmanager.com',
  'bat.bing.com',
  'www.clarity.ms',
  'clarity.ms',
];

const APP_HOSTS = new Set(['127.0.0.1', 'localhost']);
const CONSENT_CHUNK_PATTERN = /CookieBanner-.*\.js$/;
const ERROR_BOUNDARY_TEXT = 'No pudimos cargar esta sección';

// Records off-origin traffic (answered locally) and every request that would be a
// consent-owned chunk. `failConsentChunks` reproduces the old outage injection.
async function interceptTraffic(page, { failConsentChunks = false } = {}) {
  const hits = [];
  const consentChunkRequests = [];

  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());

    if (!APP_HOSTS.has(url.hostname)) {
      hits.push(url.hostname);
      return route.fulfill({ status: 204, contentType: 'application/json', body: '{}' });
    }

    if (CONSENT_CHUNK_PATTERN.test(url.pathname)) {
      consentChunkRequests.push(url.pathname);
      if (failConsentChunks) return route.abort('failed');
    }
    return route.continue();
  });

  return { hits, consentChunkRequests };
}

test.describe('cookie preferences entry point', () => {
  test.use({ locale: 'es-MX' });

  test('the dialog owns no consent chunk, and the footer entry point still opens it', async ({ page }) => {
    const traffic = await interceptTraffic(page);

    await page.addInitScript(() => {
      localStorage.setItem('cookiesAccepted', 'true');
      localStorage.setItem('lang', 'es');
      localStorage.setItem('mercasto_language', 'es');
      localStorage.setItem('cookie_consent', 'essential');
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const settings = page.getByTestId('cookie-settings');
    await expect(settings).toBeAttached();
    await settings.scrollIntoViewIfNeeded();
    await settings.click();

    await expect(page.getByTestId('cookie-banner')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('cookie-consent-state')).toContainText('esenciales');

    // The consent dialog must not depend on a lazily fetched chunk: if a
    // `CookieBanner-*.js` request appears here, the availability coupling is back.
    expect(traffic.consentChunkRequests).toEqual([]);

    // Opening the dialog must not change the stored decision and must not wake any
    // tracking vendor.
    await expect.poll(() => page.evaluate(() => localStorage.getItem('cookie_consent'))).toBe('essential');
    expect(traffic.hits.filter((host) => VENDOR_HOSTS.includes(host))).toEqual([]);
  });

  test('a failed consent-chunk fetch can no longer replace the application', async ({ page }) => {
    // This is the exact condition that used to take the app down: while the dialog was
    // lazily loaded, aborting its chunk threw into the root ErrorBoundary, the shell was
    // replaced by the error page, and staleChunkRecovery navigated to
    // `/?__mercasto_refresh=<ts>`.
    const traffic = await interceptTraffic(page, { failConsentChunks: true });

    await page.addInitScript(() => {
      localStorage.setItem('lang', 'es');
      localStorage.setItem('mercasto_language', 'es');
      localStorage.setItem('cookie_consent', 'essential');
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // The application shell survives, so the footer entry point is still there.
    const settings = page.getByTestId('cookie-settings');
    await expect(settings).toBeAttached({ timeout: 15_000 });
    await settings.scrollIntoViewIfNeeded();
    await settings.click();

    await expect(page.getByTestId('cookie-banner')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('cookie-consent-state')).toContainText('esenciales');

    // No fallback to the error page, and no stale-chunk recovery navigation.
    await expect(page.locator('body')).not.toContainText(ERROR_BOUNDARY_TEXT);
    expect(page.url()).not.toContain('__mercasto_refresh');
    expect(traffic.consentChunkRequests).toEqual([]);
  });

  test('a click made after the dialog is mounted opens it straight away', async ({ page }) => {
    const traffic = await interceptTraffic(page);

    await page.addInitScript(() => {
      localStorage.setItem('lang', 'es');
      localStorage.setItem('mercasto_language', 'es');
      localStorage.setItem('cookie_consent', 'all');
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

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
