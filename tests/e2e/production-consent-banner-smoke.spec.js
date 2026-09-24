import { test, expect } from '@playwright/test';

/**
 * Production smoke: a first-time visitor must be prompted for cookie consent.
 *
 * Why this exists as a separate spec: the only other fresh-profile banner
 * assertion lives in tests/e2e/mobile-shell-touch-targets.spec.js and is gated on
 * a project name that exists in only one of the two Playwright configs, so it is
 * silently skipped in some runs. Production CI (scripts/public-e2e-ci.sh) also
 * asserted nothing at all about banner appearance, which is why a banner that
 * failed to appear was invisible to CI.
 *
 * This spec is deliberately project-agnostic and asserts the failure can never
 * hide again:
 *   - visibility is asserted by POLLING (`toBeVisible({ timeout })`), never by a
 *     one-shot isVisible() read that can sample before the banner's 800ms
 *     show-timer commits;
 *   - the banner is bundled eagerly with the shell, so a first visit must not
 *     depend on a separate `CookieBanner-*.js` request that can fail independently;
 *   - the stale-module fallback sentinel must never have fired;
 *   - no decision may have been written for the visitor (a "fix" must never
 *     suppress the banner by silently accepting consent).
 */
test.describe('consent banner for a first-time visitor', () => {
  test('a clean profile is prompted, and the banner is the real module', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.removeItem('cookie_consent');
        localStorage.removeItem('cookiesAccepted');
        sessionStorage.clear();
      } catch {
        // Storage may be restricted; the test then reflects a stricter browser.
      }
    });

    const bannerResponses = [];
    const fallbackErrors = [];
    page.on('response', (response) => {
      if (/\/assets\/CookieBanner-/.test(response.url())) bannerResponses.push(response);
    });
    page.on('console', (message) => {
      if (message.type() === 'error' && /stale-module fallback/i.test(message.text())) {
        fallbackErrors.push(message.text());
      }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 1. POLLED visibility. Never a one-shot sample: the banner shows on an
    //    800ms timer, so a sample taken earlier reports a false negative.
    await expect(page.getByTestId('cookie-banner')).toBeVisible({ timeout: 15000 });

    // 2. Consent is intentionally eager. A separate CookieBanner chunk would
    //    reintroduce a network boundary between a first-time visitor and the
    //    legally required choice UI.
    expect(
      bannerResponses,
      'CookieBanner must be bundled eagerly and must not request a consent-owned lazy chunk',
    ).toEqual([]);

    // 3. The fallback's own sentinel must not have fired in this session.
    const sentinel = await page.evaluate(() => {
      try {
        return sessionStorage.getItem('mercasto.stale_module_fallback.v2');
      } catch {
        return 'unreadable';
      }
    });
    expect(sentinel, 'stale-module fallback ran in this session').toBeNull();

    // 4. The fallback must be loud if it ever runs (observability contract).
    expect(fallbackErrors, 'stale-module fallback logged a loud error').toEqual([]);

    // 5. Being prompted must not mean being consented: no decision may be
    //    written on the visitor's behalf.
    expect(await page.evaluate(() => localStorage.getItem('cookie_consent'))).toBeNull();
  });
});
